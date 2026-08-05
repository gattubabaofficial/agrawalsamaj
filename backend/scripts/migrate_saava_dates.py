"""Migrate saava_dates table to add missing columns."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

neon_url = "postgresql+asyncpg://neondb_owner:npg_tnmNUj0B3vDl@ep-ancient-salad-aymdzbjr-pooler.c-5.us-east-2.aws.neon.tech/neondb?ssl=require"
engine = create_async_engine(neon_url)

async def main():
    async with engine.begin() as conn:
        # Check current saava_dates columns
        res = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'saava_dates' ORDER BY ordinal_position"
        ))
        existing_cols = [r[0] for r in res.fetchall()]
        print(f"Current saava_dates columns: {existing_cols}")
        
        # List of migrations needed
        migrations = [
            ("disable_social_discount", "ALTER TABLE saava_dates ADD COLUMN disable_social_discount BOOLEAN NOT NULL DEFAULT TRUE"),
            ("disable_individual_rooms", "ALTER TABLE saava_dates ADD COLUMN disable_individual_rooms BOOLEAN NOT NULL DEFAULT TRUE"),
            ("disable_member_discount", "ALTER TABLE saava_dates ADD COLUMN disable_member_discount BOOLEAN NOT NULL DEFAULT FALSE"),
            ("is_blocked", "ALTER TABLE saava_dates ADD COLUMN is_blocked BOOLEAN NOT NULL DEFAULT FALSE"),
        ]
        
        for col_name, stmt in migrations:
            if col_name not in existing_cols:
                try:
                    print(f"Adding column '{col_name}'...")
                    await conn.execute(text(stmt))
                    print(f"  Success!")
                except Exception as e:
                    print(f"  Error: {e}")
            else:
                print(f"Column '{col_name}' already exists, skipping.")
    
    # Verify final columns
    async with engine.begin() as conn:
        res = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'saava_dates' ORDER BY ordinal_position"
        ))
        final_cols = [r[0] for r in res.fetchall()]
        print(f"\nFinal saava_dates columns: {final_cols}")

if __name__ == "__main__":
    asyncio.run(main())
