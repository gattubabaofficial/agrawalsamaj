import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.user import User, UserRole
from app.models.role import CustomRole
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

neon_url = "postgresql+asyncpg://neondb_owner:npg_tnmNUj0B3vDl@ep-ancient-salad-aymdzbjr-pooler.c-5.us-east-2.aws.neon.tech/neondb?ssl=require"

engine = create_async_engine(neon_url)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def query_users():
    async with SessionLocal() as db:
        print("Searching for users with corrupted/masked mobile numbers in database...")
        result = await db.execute(select(User).where(
            (User.mobile.like("%X%")) | (User.mobile.like("%x%")) |
            (User.contact_mobile.like("%X%")) | (User.contact_mobile.like("%x%"))
        ))
        users = result.scalars().all()
        print(f"Found {len(users)} users with corrupted numbers:")
        for u in users:
            print(f"User: {u.first_name} {u.surname} | ID: {u.user_id} | Role: {u.role} | Custom Role ID: {u.custom_role_id} | Mobile: {u.mobile} | Contact Mobile: {u.contact_mobile}")
            
        print("\nListing all custom roles in database...")
        res = await db.execute(select(CustomRole))
        roles = res.scalars().all()
        for r in roles:
            print(f"Role Name: {r.name} | ID: {r.role_id}")

if __name__ == "__main__":
    asyncio.run(query_users())
