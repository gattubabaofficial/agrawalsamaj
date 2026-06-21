import asyncio
import sys
import os

# Add the parent directory to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.utils.security import hash_password

async def seed_data():
    async with SessionLocal() as db:
        # Create guest user
        guest_email = "guest@gmail.com"
        guest_result = await db.execute(select(User).where(User.email == guest_email))
        if guest_result.scalars().first() is None:
            new_guest = User(
                first_name="Guest",
                surname="User",
                email=guest_email,
                password_hash=hash_password("guest@12345"),
                role=UserRole.GUEST,
                is_active=True,
                is_member=False,
            )
            db.add(new_guest)
            print(f"Created guest: {guest_email}")
        else:
            print(f"Guest {guest_email} already exists.")

        # Create member user
        member_email = "member@gmail.com"
        member_result = await db.execute(select(User).where(User.email == member_email))
        if member_result.scalars().first() is None:
            new_member = User(
                first_name="Member",
                surname="User",
                email=member_email,
                password_hash=hash_password("member@12345"),
                role=UserRole.MEMBER,
                is_active=True,
                is_member=True,
                samaj_id="SMJ-001"
            )
            db.add(new_member)
            print(f"Created member: {member_email}")
        else:
            print(f"Member {member_email} already exists.")

        # Create admin user
        admin_email = "admin@gmail.com"
        admin_result = await db.execute(select(User).where(User.email == admin_email))
        if admin_result.scalars().first() is None:
            new_admin = User(
                first_name="Admin",
                surname="User",
                email=admin_email,
                password_hash=hash_password("admin@12345"),
                role=UserRole.ADMIN,
                is_active=True,
                is_member=True,
            )
            db.add(new_admin)
            print(f"Created admin: {admin_email}")
        else:
            print(f"Admin {admin_email} already exists.")

        await db.commit()

async def main():
    print("Starting database seeding...")
    await seed_data()
    print("Seeding complete.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
