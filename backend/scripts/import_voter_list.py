import asyncio
import os
import sys
import openpyxl
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, text

# Add parent dir to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.user import User, UserRole, Family

FILE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "voter_list_alphabetically.xlsx"))

LOCAL_DB_URL = "sqlite+aiosqlite:///./test.db"
RENDER_DB_URL = "postgresql+asyncpg://agrawal_user:FSVrY0dsB7WXBtepD5MMNC03otIieoLD@dpg-d9lnid7qj5pc739e9o1g-a.virginia-postgres.render.com/agrawalsamaj"


async def import_to_db(db_url: str, db_name: str):
    print(f"\n[+] Connecting to {db_name} database...")
    engine = create_async_engine(db_url, echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    if not os.path.exists(FILE_PATH):
        print(f"[-] Excel file not found at: {FILE_PATH}")
        return

    wb = openpyxl.load_workbook(FILE_PATH, read_only=True)
    sheet = wb["Voter List"]

    async with session_factory() as session:
        # Clear existing imported members to prevent unique constraint conflicts
        await session.execute(text("DELETE FROM users WHERE is_member = true"))
        await session.commit()

        # Get existing mobile set
        existing_res = await session.execute(select(User.mobile).where(User.mobile.isnot(None)))
        existing_mobiles = set(r[0] for r in existing_res.all())

        imported_count = 0
        skipped_count = 0

        print(f"[+] Parsing and inserting 3,400+ members into {db_name}...")
        
        batch = []
        for i, row in enumerate(sheet.iter_rows(values_only=True)):
            if i == 0:
                continue # Skip header: LM No., Name, Father's Name, Zone, House No., Address, Mobile No., Status

            lm_no_raw, full_name_raw, father_name_raw, zone_raw, house_no_raw, address_raw, mobile_raw, status_raw = (row + (None,)*8)[:8]

            if not full_name_raw:
                continue

            full_name = str(full_name_raw).strip()
            name_parts = full_name.split(" ", 1)
            first_name = name_parts[0].capitalize()
            surname = name_parts[1].capitalize() if len(name_parts) > 1 else "Agrawal"

            try:
                lm_no = int(lm_no_raw) if lm_no_raw is not None else None
            except:
                lm_no = None

            contact_mobile = str(mobile_raw).strip()[:20] if mobile_raw else None

            # Assign unique login mobile if not already taken
            mobile = None
            if contact_mobile and len(contact_mobile) >= 10:
                clean_mobile = contact_mobile.replace(" ", "").replace("-", "")[-10:]
                if len(clean_mobile) == 10 and clean_mobile.isdigit() and clean_mobile not in existing_mobiles:
                    mobile = clean_mobile
                    existing_mobiles.add(clean_mobile)

            samaj_id = (f"LM-{lm_no}-{i}" if lm_no else f"MEM-{i}")[:50]
            zone = str(zone_raw).strip()[:60] if zone_raw else None
            house_no = str(house_no_raw).strip()[:60] if house_no_raw else None
            address = str(address_raw).strip()[:500] if address_raw else None
            father_name = str(father_name_raw).strip()[:100] if father_name_raw else None

            member_user = User(
                samaj_id=samaj_id,
                lm_no=lm_no,
                first_name=first_name,
                surname=surname,
                father_name=father_name,
                zone=zone,
                house_no=house_no,
                address=address,
                contact_mobile=contact_mobile,
                mobile=mobile,
                role=UserRole.MEMBER,
                is_member=True,
                member_status="active",
                is_active=True,
            )
            session.add(member_user)
            imported_count += 1

            if imported_count % 500 == 0:
                await session.commit()
                print(f"    OK  Imported {imported_count} members...")

        await session.commit()
        print(f"[DONE] Successfully imported {imported_count} members into {db_name}!\n")

    await engine.dispose()


async def main():
    # Import into local SQLite first
    await import_to_db(LOCAL_DB_URL, "Local SQLite")
    # Import into live Render PostgreSQL
    await import_to_db(RENDER_DB_URL, "Render PostgreSQL")


if __name__ == "__main__":
    asyncio.run(main())
