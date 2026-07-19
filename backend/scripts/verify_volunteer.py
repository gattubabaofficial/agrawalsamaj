import asyncio
import os
import sys
import bcrypt

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.user import User, UserRole

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

async def verify_volunteer():
    async with SessionLocal() as db:
        # Create a volunteer user
        volunteer_email = "volunteer_test@agrawalsamaj.org"
        from sqlalchemy import select
        existing = await db.execute(select(User).filter(User.email == volunteer_email))
        vol = existing.scalar_one_or_none()
        
        if not vol:
            vol = User(
                first_name="Test",
                surname="Volunteer",
                email=volunteer_email,
                password_hash=hash_password("password123"),
                role=UserRole.VOLUNTEER,
                is_member=False
            )
            db.add(vol)
            await db.commit()
            await db.refresh(vol)
            
        print(f"Created volunteer user with ID: {vol.user_id} and role {vol.role}")

if __name__ == "__main__":
    asyncio.run(verify_volunteer())
