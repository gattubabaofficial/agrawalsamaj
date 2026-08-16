import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.user import User
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

neon_url = "postgresql+asyncpg://neondb_owner:npg_tnmNUj0B3vDl@ep-ancient-salad-aymdzbjr-pooler.c-5.us-east-2.aws.neon.tech/neondb?ssl=require"

engine = create_async_engine(neon_url)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def clear_otps():
    async with SessionLocal() as db:
        print("Clearing OTP logs and requests for 8290909163 to bypass rate limit...")
        
        # Delete from phone_otp_requests (uses 'phone' column)
        await db.execute(text("DELETE FROM phone_otp_requests WHERE phone = '8290909163'"))
        
        # Delete from otp_logs (uses 'target' column)
        await db.execute(text("DELETE FROM otp_logs WHERE target = '8290909163'"))
        
        await db.commit()
        print("OTP rate limit cleared successfully!")

if __name__ == "__main__":
    asyncio.run(clear_otps())
