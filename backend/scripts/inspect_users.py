import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.models.user import User
from sqlalchemy import select

sqlite_url = "sqlite+aiosqlite:///./test.db"
engine = create_async_engine(sqlite_url)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def main():
    async with SessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        print(f"Total SQLite Users: {len(users)}")
        for u in users:
            print(f"Name: {u.first_name} {u.surname} | Email: {u.email} | Mobile: {u.mobile} | Role: {u.role} | Custom Role: {u.custom_role_id}")

if __name__ == "__main__":
    asyncio.run(main())
