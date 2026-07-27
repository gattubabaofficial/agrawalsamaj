"""
Imports the members from `voter_list_alphabetically.xlsx` into the users table so
they appear in the public / admin Members directory.

Design notes
------------
* People marked "Shifted", "Expired", "Sold out", etc. in the source list are NOT
  dropped. They are imported like everyone else and flagged via `member_status`
  (active | shifted | expired | sold_out | shifted_sold_out | double_name), so the
  frontend can badge them instead of hiding them.
* The list repeats the same phone number across different people and even repeats a
  few LM numbers. Since `users.mobile` and `users.samaj_id` are UNIQUE columns, we:
    - store the display number in the non-unique `contact_mobile` for everyone, and
      additionally set the unique `mobile` only for the first person to use a given
      number (so their OTP self-edit still works);
    - build `samaj_id` as "LM-<lm_no>", appending -2/-3… when an LM number repeats.
* Idempotent: every row imported here is tagged `admin_notes = 'voter_list_import'`.
  Re-running first deletes the previous import, then re-inserts — so the directory
  always matches the spreadsheet exactly.

Run from the backend/ directory:
    venv\\Scripts\\python.exe scripts/import_voter_list.py
    venv\\Scripts\\python.exe scripts/import_voter_list.py --file ../voter_list_alphabetically.xlsx
"""

import argparse
import asyncio
import os
import re
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv(override=True)

import openpyxl
from sqlalchemy import select, text

from app.database import SessionLocal, engine
from app.models.user import User, UserRole

IMPORT_MARKER = "voter_list_import"

DEFAULT_XLSX = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "voter_list_alphabetically.xlsx")
)

# Extra columns this import relies on. main.py adds these on app startup, but this
# script may run before the server ever boots, so ensure they exist here too.
COLUMN_DDL = (
    "ALTER TABLE users ADD COLUMN lm_no INTEGER",
    "ALTER TABLE users ADD COLUMN zone VARCHAR(60)",
    "ALTER TABLE users ADD COLUMN house_no VARCHAR(60)",
    "ALTER TABLE users ADD COLUMN contact_mobile VARCHAR(20)",
    "ALTER TABLE users ADD COLUMN member_status VARCHAR(30) DEFAULT 'active'",
)


def normalize_status(raw) -> str:
    """Map the free-text Status cell to a canonical status slug."""
    if raw is None:
        return "active"
    s = str(raw).strip().lower()
    if not s:
        return "active"
    has_shift = "shift" in s
    has_sold = "sold" in s
    has_expire = "expire" in s
    has_double = "double" in s
    if has_shift and has_sold:
        return "shifted_sold_out"
    if has_expire:
        return "expired"
    if has_shift:
        return "shifted"
    if has_sold:
        return "sold_out"
    if has_double:
        return "double_name"
    return "active"


def clean_name(name) -> str:
    """Strip status tags like '(EXPIRED)' / '(SHIFTED)' and collapse whitespace."""
    n = re.sub(r"\([^()]*\)", " ", str(name or ""))
    return re.sub(r"\s+", " ", n).strip()


def split_name(full: str):
    parts = full.split()
    if not parts:
        return None
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def clean_text(v):
    if v is None:
        return None
    s = str(v).strip()
    if s in ("", "-", "--", "—", "N/A", "n/a"):
        return None
    return s


def clean_code(v):
    """Zone / House No. — keep numbers as plain integers, everything else as text."""
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    if isinstance(v, int):
        return str(v)
    s = str(v).strip()
    return s or None


def extract_mobile(v):
    """First valid 10-digit Indian mobile (starts 6-9) found in the cell, else None."""
    if v is None:
        return None
    m = re.search(r"(?<!\d)[6-9]\d{9}(?!\d)", re.sub(r"[^\d]", " ", str(v)))
    return m.group(0) if m else None


async def ensure_columns():
    async with engine.begin() as conn:
        for ddl in COLUMN_DDL:
            try:
                await conn.execute(text(ddl))
            except Exception:
                pass


async def run(xlsx_path: str):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if not os.path.exists(xlsx_path):
        print(f"[ERROR] Spreadsheet not found: {xlsx_path}")
        sys.exit(1)

    await ensure_columns()

    print(f"[IMPORT] Reading {xlsx_path} ...")
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb["Voter List"] if "Voter List" in wb.sheetnames else wb.worksheets[0]

    async with SessionLocal() as db:
        # 1. Remove any previous import so re-runs stay in sync with the sheet.
        prev = await db.execute(select(User).where(User.admin_notes == IMPORT_MARKER))
        prev_users = prev.scalars().all()
        for u in prev_users:
            await db.delete(u)
        if prev_users:
            await db.commit()
            print(f"[IMPORT] Removed {len(prev_users)} rows from a previous import.")

        # 2. Snapshot the unique values already taken by everyone who remains, so we
        #    never collide with existing accounts on mobile / samaj_id.
        existing = await db.execute(select(User.mobile, User.samaj_id))
        used_mobiles = set()
        used_samaj = set()
        for mob, sid in existing.all():
            if mob:
                used_mobiles.add(mob)
            if sid:
                used_samaj.add(sid)

        created = 0
        status_counts = {}
        skipped_no_name = 0

        for row in ws.iter_rows(min_row=2, values_only=True):
            if row is None or all(c is None for c in row):
                continue
            lm_no_raw, name_raw, father_raw, zone_raw, house_raw, addr_raw, mobile_raw, status_raw = (
                list(row) + [None] * 8
            )[:8]

            full_name = clean_name(name_raw)
            names = split_name(full_name)
            if not names:
                skipped_no_name += 1
                continue
            first_name, surname = names

            # LM number -> samaj_id (deduped for the handful of repeated numbers).
            lm_no = None
            samaj_id = None
            if isinstance(lm_no_raw, (int, float)) and not isinstance(lm_no_raw, bool):
                lm_no = int(lm_no_raw)
            elif lm_no_raw is not None and str(lm_no_raw).strip().isdigit():
                lm_no = int(str(lm_no_raw).strip())
            if lm_no is not None:
                base = f"LM-{lm_no}"
                candidate = base
                suffix = 2
                while candidate in used_samaj:
                    candidate = f"{base}-{suffix}"
                    suffix += 1
                samaj_id = candidate
                used_samaj.add(candidate)

            # Phone: everyone keeps a display number; only the first owner of a number
            # gets it on the unique `mobile` column.
            display_mobile = extract_mobile(mobile_raw)
            unique_mobile = None
            if display_mobile and display_mobile not in used_mobiles:
                unique_mobile = display_mobile
                used_mobiles.add(display_mobile)

            status = normalize_status(status_raw)
            status_counts[status] = status_counts.get(status, 0) + 1

            db.add(User(
                first_name=first_name,
                surname=surname,
                father_name=clean_text(father_raw),
                lm_no=lm_no,
                samaj_id=samaj_id,
                zone=clean_code(zone_raw),
                house_no=clean_code(house_raw),
                address=clean_text(addr_raw),
                mobile=unique_mobile,
                contact_mobile=display_mobile,
                member_status=status,
                role=UserRole.MEMBER,
                is_member=True,
                is_active=True,
                admin_notes=IMPORT_MARKER,
            ))
            created += 1

        await db.commit()

    print(f"[DONE] Imported {created} members.")
    if skipped_no_name:
        print(f"       Skipped {skipped_no_name} rows with no usable name.")
    print("       Status breakdown:")
    for status, count in sorted(status_counts.items(), key=lambda kv: -kv[1]):
        print(f"         {status:<18} {count}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import members from the voter list spreadsheet.")
    parser.add_argument("--file", default=DEFAULT_XLSX, help="Path to voter_list_alphabetically.xlsx")
    args = parser.parse_args()
    asyncio.run(run(args.file))
