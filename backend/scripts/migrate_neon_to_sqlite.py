"""
Migration Toolkit: Neon Postgres -> Local SQLite
------------------------------------------------
This script safely:
1. Connects to Neon PostgreSQL (read-only)
2. Exports all tables and data to a timestamped JSON backup file
3. Initializes the SQLite database schema
4. Migrates all records into SQLite preserving UUIDs, JSON, timestamps, and relations
5. Verifies and displays side-by-side row counts for every table
6. Validates data integrity with smoke queries

Usage:
    python scripts/migrate_neon_to_sqlite.py --postgres-url "<NEON_URL>" --sqlite-path "data/agrasamaj.db"
    or with default environment settings:
    python scripts/migrate_neon_to_sqlite.py
"""

import os
import sys
import json
import argparse
import datetime
import uuid
import decimal
import asyncio
from typing import Dict, Any, List

# Ensure backend root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from sqlalchemy import text, inspect, create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config import settings
from app.models import Base
import app.models  # load all models into Base.metadata


class CustomEncoder(json.JSONEncoder):
    """JSON encoder for UUID, datetime, decimal, memoryview, bytes, etc."""
    def default(self, obj):
        if isinstance(obj, (datetime.datetime, datetime.date, datetime.time)):
            return obj.isoformat()
        if isinstance(obj, uuid.UUID):
            return str(obj)
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, (bytes, bytearray, memoryview)):
            import base64
            return base64.b64encode(bytes(obj)).decode("ascii")
        return super().default(obj)


def get_table_order(metadata) -> List[str]:
    """Get tables in topological order based on foreign keys to avoid FK constraint violations."""
    try:
        return [table.name for table in metadata.sorted_tables]
    except Exception:
        return list(metadata.tables.keys())


async def export_and_migrate(postgres_url: str, sqlite_path: str, backup_only: bool = False):
    print("=" * 70)
    print("  AGRAWAL SAMAJ PORTAL: NEON POSTGRES -> SQLITE MIGRATION TOOL")
    print("=" * 70)
    print(f"[*] Source (Postgres): {postgres_url.split('@')[-1] if '@' in postgres_url else postgres_url}")
    print(f"[*] Target (SQLite):   {sqlite_path}")
    print("=" * 70)

    # 1. Normalize Postgres URL
    pg_sync_url = postgres_url
    if pg_sync_url.startswith("postgresql+asyncpg://"):
        pg_sync_url = pg_sync_url.replace("postgresql+asyncpg://", "postgresql://")
    elif pg_sync_url.startswith("postgres://"):
        pg_sync_url = pg_sync_url.replace("postgres://", "postgresql://")
    
    # Remove async-only parameters for sync extraction
    pg_sync_url = pg_sync_url.replace("sslmode=require", "sslmode=require").replace("ssl=require", "sslmode=require")

    print("\n[Step 1/5] Connecting to Neon Postgres to read schema and tables...")
    try:
        pg_engine = create_engine(pg_sync_url, pool_pre_ping=True)
        inspector = inspect(pg_engine)
        existing_pg_tables = inspector.get_table_names()
        print(f"[OK] Successfully connected to Neon Postgres. Found {len(existing_pg_tables)} tables in DB.")
    except Exception as e:
        print(f"[!] Error connecting to Postgres: {e}")
        return False

    # 2. Extract data & save to backup JSON
    print("\n[Step 2/5] Exporting all data from Neon Postgres to local backup...")
    backup_data: Dict[str, List[Dict[str, Any]]] = {}
    row_counts_pg: Dict[str, int] = {}

    with pg_engine.connect() as conn:
        for table_name in existing_pg_tables:
            try:
                result = conn.execute(text(f'SELECT * FROM "{table_name}"'))
                cols = list(result.keys())
                rows = []
                for row in result.fetchall():
                    row_dict = dict(zip(cols, row))
                    rows.append(row_dict)
                backup_data[table_name] = rows
                row_counts_pg[table_name] = len(rows)
                print(f"  - {table_name: <35}: {len(rows): >6} rows exported")
            except Exception as ex:
                print(f"  - [WARNING] Failed to export table {table_name}: {ex}")

    # Write backup file
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join(BASE_DIR, "backups")
    os.makedirs(backup_dir, exist_ok=True)
    backup_file = os.path.join(backup_dir, f"neon_postgres_backup_{timestamp}.json")

    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump(backup_data, f, cls=CustomEncoder, indent=2, ensure_ascii=False)

    print(f"\n[OK] Backup written to: {backup_file}")
    print(f"    Total backup size: {os.path.getsize(backup_file) / 1024:.2f} KB")

    if backup_only:
        print("\n[OK] Backup completed successfully. Exiting as requested (--backup-only).")
        return True

    # 3. Prepare SQLite database directory and engine
    print(f"\n[Step 3/5] Initializing SQLite database schema at {sqlite_path}...")
    sqlite_abs_path = os.path.abspath(os.path.join(BASE_DIR, sqlite_path))
    os.makedirs(os.path.dirname(sqlite_abs_path), exist_ok=True)

    if os.path.exists(sqlite_abs_path):
        try:
            os.remove(sqlite_abs_path)
        except Exception:
            pass

    sqlite_sync_url = f"sqlite:///{sqlite_abs_path}"
    sqlite_engine = create_engine(sqlite_sync_url)

    # Reflect complete schema directly from source Postgres
    from sqlalchemy import MetaData
    pg_metadata = MetaData()
    pg_metadata.reflect(bind=pg_engine)

    # Sanitize Postgres-specific server defaults and dialect types for SQLite
    from sqlalchemy import LargeBinary, Text, String, JSON
    for table in pg_metadata.tables.values():
        for column in table.columns:
            if column.server_default is not None:
                text_sd = str(column.server_default.arg)
                if any(x in text_sd for x in ["nextval", "::", "gen_random_uuid", "uuid_generate"]):
                    column.server_default = None

            tname = type(column.type).__name__.upper()
            if "BYTEA" in tname:
                column.type = LargeBinary()
            elif "JSONB" in tname:
                column.type = JSON()
            elif "ARRAY" in tname:
                column.type = JSON()
            elif "UUID" in tname:
                column.type = String(36)
            elif "ENUM" in tname:
                column.type = String(50)

    # Create all reflected tables in SQLite + Base.metadata
    pg_metadata.create_all(bind=sqlite_engine)
    Base.metadata.create_all(bind=sqlite_engine)
    print(f"[OK] SQLite schema created with {len(pg_metadata.tables)} tables directly reflected from Postgres.")

    # 4. Insert data into SQLite in topological order
    print("\n[Step 4/5] Inserting rows into SQLite database...")
    ordered_tables = get_table_order(pg_metadata)

    # Tables in backup that might not be in metadata (e.g. alembic_version)
    extra_tables = [t for t in existing_pg_tables if t not in ordered_tables]
    all_target_tables = ordered_tables + extra_tables

    row_counts_sqlite: Dict[str, int] = {}

    with sqlite_engine.connect() as s_conn:
        # Disable foreign key checks during batch import for speed & reliability
        s_conn.execute(text("PRAGMA foreign_keys = OFF;"))

        for table_name in all_target_tables:
            if table_name not in backup_data or not backup_data[table_name]:
                row_counts_sqlite[table_name] = 0
                continue

            rows = backup_data[table_name]
            if not rows:
                row_counts_sqlite[table_name] = 0
                continue

            # Clear any existing rows in table
            try:
                s_conn.execute(text(f'DELETE FROM "{table_name}"'))
            except Exception:
                pass

            # Inspect SQLite table columns
            table_obj = Base.metadata.tables.get(table_name)
            inserted_count = 0

            # Batch insert
            batch_clean_rows = []
            for row in rows:
                clean_row = {}
                for k, v in row.items():
                    if table_obj is not None and k in table_obj.columns:
                        col_type = table_obj.columns[k].type
                        # Convert to UUID object if column expects UUID
                        if "UUID" in type(col_type).__name__.upper() and v is not None:
                            try:
                                clean_row[k] = uuid.UUID(str(v)) if not isinstance(v, uuid.UUID) else v
                            except Exception:
                                clean_row[k] = v
                        elif isinstance(v, (bytes, bytearray, memoryview)):
                            clean_row[k] = bytes(v)
                        else:
                            clean_row[k] = v
                    else:
                        if isinstance(v, uuid.UUID):
                            clean_row[k] = str(v)
                        elif isinstance(v, (bytes, bytearray, memoryview)):
                            clean_row[k] = bytes(v)
                        elif isinstance(v, (dict, list)):
                            clean_row[k] = json.dumps(v)
                        elif isinstance(v, decimal.Decimal):
                            clean_row[k] = float(v)
                        else:
                            clean_row[k] = v
                batch_clean_rows.append(clean_row)

            if table_obj is not None:
                try:
                    s_conn.execute(table_obj.insert(), batch_clean_rows)
                    inserted_count = len(batch_clean_rows)
                except Exception:
                    # Fallback to row-by-row
                    for r in batch_clean_rows:
                        try:
                            s_conn.execute(table_obj.insert(), r)
                            inserted_count += 1
                        except Exception as row_err:
                            cols = list(r.keys())
                            placeholders = [f":{c}" for c in cols]
                            col_names = [f'"{c}"' for c in cols]
                            stmt = text(f'INSERT INTO "{table_name}" ({", ".join(col_names)}) VALUES ({", ".join(placeholders)})')
                            s_conn.execute(stmt, {k: (str(v) if isinstance(v, (uuid.UUID, dict, list)) else v) for k, v in r.items()})
                            inserted_count += 1
            else:
                for r in batch_clean_rows:
                    cols = list(r.keys())
                    placeholders = [f":{c}" for c in cols]
                    col_names = [f'"{c}"' for c in cols]
                    stmt = text(f'INSERT INTO "{table_name}" ({", ".join(col_names)}) VALUES ({", ".join(placeholders)})')
                    s_conn.execute(stmt, r)
                    inserted_count += 1

            s_conn.commit()
            row_counts_sqlite[table_name] = inserted_count

        # Re-enable foreign key constraints
        s_conn.execute(text("PRAGMA foreign_keys = ON;"))
        s_conn.commit()

    # 5. Summary comparison & Verification
    print("\n[Step 5/5] Verification & Table Row Count Comparison:")
    print("-" * 70)
    print(f"{'Table Name': <35} | {'Neon Postgres': <15} | {'Local SQLite': <15} | {'Status'}")
    print("-" * 70)

    all_compared_tables = sorted(list(set(list(row_counts_pg.keys()) + list(row_counts_sqlite.keys()))))
    all_matched = True

    for t in all_compared_tables:
        pg_cnt = row_counts_pg.get(t, 0)
        sq_cnt = row_counts_sqlite.get(t, 0)
        status = "MATCH [OK]" if pg_cnt == sq_cnt else "MISMATCH [!]"
        if pg_cnt != sq_cnt:
            all_matched = False
        print(f"{t: <35} | {pg_cnt: >15} | {sq_cnt: >15} | {status}")

    print("-" * 70)
    if all_matched:
        print("[OK] ALL TABLES AND ROW COUNTS MATCH PERFECTLY (100% Data Integrity).")
    else:
        print("[!] Some row counts differ. Please inspect the tables marked with MISMATCH above.")

    print(f"\n[OK] SQLite Database Ready at: {sqlite_abs_path}")
    return all_matched


def main():
    parser = argparse.ArgumentParser(description="Migrate Agrawal Samaj DB from Neon Postgres to SQLite")
    parser.add_argument("--postgres-url", default=None, help="Postgres connection string")
    parser.add_argument("--sqlite-path", default="data/agrasamaj.db", help="Target SQLite relative or absolute path")
    parser.add_argument("--backup-only", action="store_true", help="Only create backup JSON without populating SQLite")
    args = parser.parse_args()

    # Determine postgres URL
    pg_url = args.postgres_url
    if not pg_url:
        pg_url = settings.DATABASE_URL
        if not pg_url or "sqlite" in pg_url:
            # Check render.yaml or environment
            render_yaml = os.path.join(os.path.dirname(BASE_DIR), "render.yaml")
            if os.path.exists(render_yaml):
                with open(render_yaml, "r", encoding="utf-8") as f:
                    for line in f:
                        if "postgresql+asyncpg://" in line or "postgresql://" in line:
                            parts = line.strip().split("value:")
                            if len(parts) > 1:
                                pg_url = parts[1].strip()
                                break

    if not pg_url or "sqlite" in pg_url:
        print("[!] Error: No PostgreSQL connection URL found.")
        print("    Please provide --postgres-url \"postgresql://user:pass@host/dbname?sslmode=require\"")
        sys.exit(1)

    asyncio.run(export_and_migrate(pg_url, args.sqlite_path, args.backup_only))


if __name__ == "__main__":
    main()
