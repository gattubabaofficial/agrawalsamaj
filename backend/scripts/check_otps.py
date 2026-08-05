import asyncio
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.user import PhoneOTPRequest
from sqlalchemy import select

async def check_otps():
    async with SessionLocal() as db:
        print("Checking recent OTP requests...")
        result = await db.execute(select(PhoneOTPRequest).order_by(PhoneOTPRequest.created_at.desc()).limit(10))
        reqs = result.scalars().all()
        for r in reqs:
            print(f"ID: {r.id} | Phone: {r.phone} | Created At: {r.created_at} | Verified: {r.verified} | Attempts: {r.attempts} | Expires At: {r.expires_at}")

if __name__ == "__main__":
    asyncio.run(check_otps())
