import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.user import User, UserRole
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

neon_url = "postgresql+asyncpg://neondb_owner:npg_tnmNUj0B3vDl@ep-ancient-salad-aymdzbjr-pooler.c-5.us-east-2.aws.neon.tech/neondb?ssl=require"

engine = create_async_engine(neon_url)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def repair():
    async with SessionLocal() as db:
        print("Beginning database repair of corrupted/masked mobile numbers...")
        
        # 1. Check/Delete conflicting guest user with mobile 8290909163
        conflicting_guest_res = await db.execute(
            select(User).where(User.mobile == "8290909163", User.role == UserRole.GUEST)
        )
        conflicting_guest = conflicting_guest_res.scalars().first()
        if conflicting_guest:
            print(f"Deleting conflicting guest user: ID={conflicting_guest.user_id}, Name={conflicting_guest.first_name}")
            await db.delete(conflicting_guest)
            await db.flush()
            
        # 2. Repair Tanish Bansal
        tanish_res = await db.execute(select(User).where(User.first_name.ilike("Tanish"), User.surname.ilike("Bansal")))
        tanish = tanish_res.scalars().first()
        if tanish:
            print(f"Found Tanish Bansal: Current mobile={tanish.mobile}")
            tanish.mobile = "8290909163"
            print("Set Tanish Bansal mobile to '8290909163'")
            
        # 3. Repair Aarti Goyal
        aarti_res = await db.execute(select(User).where(User.first_name.ilike("Aarti"), User.surname.ilike("Goyal")))
        aarti = aarti_res.scalars().first()
        if aarti:
            print(f"Found Aarti Goyal: Current mobile={aarti.mobile}, contact_mobile={aarti.contact_mobile}")
            aarti.mobile = "9929482204"
            print("Set Aarti Goyal mobile to '9929482204'")

        await db.commit()
        print("Database repair complete.")

if __name__ == "__main__":
    asyncio.run(repair())
