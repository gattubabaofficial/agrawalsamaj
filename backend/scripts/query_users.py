import asyncio
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import Base
from app.models.user import User
from app.models.role import CustomRole
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Neon database URL from render.yaml
neon_url = "postgresql+asyncpg://neondb_owner:npg_tnmNUj0B3vDl@ep-ancient-salad-aymdzbjr-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"
neon_url = neon_url.replace("sslmode=require", "ssl=require")

engine = create_async_engine(neon_url)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def query_users():
    async with SessionLocal() as db:
        print("Searching for Yash in database...")
        result = await db.execute(select(User).where(User.first_name.ilike("%Yash%")))
        users = result.scalars().all()
        for u in users:
            print(f"User: {u.first_name} {u.surname} | ID: {u.user_id} | Role: {u.role} | Custom Role ID: {u.custom_role_id}")
            
        print("\nListing all custom roles in database...")
        res = await db.execute(select(CustomRole))
        roles = res.scalars().all()
        for r in roles:
            print(f"Role Name: {r.name} | ID: {r.role_id}")

if __name__ == "__main__":
    asyncio.run(query_users())
