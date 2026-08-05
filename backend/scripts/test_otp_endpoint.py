import asyncio
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.routers.auth import phone_send_otp, PhoneOtpSendRequest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

neon_url = "postgresql+asyncpg://neondb_owner:npg_tnmNUj0B3vDl@ep-ancient-salad-aymdzbjr-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"
neon_url = neon_url.replace("sslmode=require", "ssl=require")

engine = create_async_engine(neon_url)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def run_endpoint():
    async with SessionLocal() as db:
        print("Calling phone_send_otp directly...")
        payload = PhoneOtpSendRequest(phone="9414054426")
        try:
            res = await phone_send_otp(payload, db)
            print("Response:", res)
        except Exception as e:
            print("\n!!! EXCEPTION CAUGHT !!!")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_endpoint())
