import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv(override=True)

from app.database import SessionLocal
from app.models.user import User, UserRole
from sqlalchemy import select

from app.utils.security import verify_password

async def main():
    async with SessionLocal() as db:
        res = await db.execute(select(User).where(User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN])))
        users = res.scalars().all()
        print(f"Total Admin Users: {len(users)}")
        for u in users:
            is_admin123 = verify_password("Admin@123", u.password_hash) if u.password_hash else False
            is_super123 = verify_password("SuperAdmin@123", u.password_hash) if u.password_hash else False
            print(f"Name: {u.first_name} {u.surname} | Email: {u.email} | Mobile: {u.mobile} | Role: {u.role} | Valid Admin@123: {is_admin123} | Valid SuperAdmin@123: {is_super123}")



if __name__ == "__main__":
    asyncio.run(main())
