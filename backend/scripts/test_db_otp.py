import asyncio
import os
import sys
import uuid
import datetime

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.user import PhoneOTPRequest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

neon_url = "postgresql+asyncpg://neondb_owner:npg_tnmNUj0B3vDl@ep-ancient-salad-aymdzbjr-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"
neon_url = neon_url.replace("sslmode=require", "ssl=require")

engine = create_async_engine(neon_url)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def test_insert():
    async with SessionLocal() as db:
        print("Testing PhoneOTPRequest insert into Neon...")
        try:
            now = datetime.datetime.utcnow()
            expires_at = now + datetime.timedelta(minutes=5)
            
            otp_request = PhoneOTPRequest(
                phone="919414054426",
                otp_hash="dummhash12345",
                expires_at=expires_at,
                attempts=0,
                verified=False
            )
            db.add(otp_request)
            await db.commit()
            print("Successfully inserted and committed!")
            
            # Clean it up so we don't pollute database
            await db.delete(otp_request)
            await db.commit()
            print("Cleaned up successfully!")
            
        except Exception as e:
            print("Error during insert/commit:")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_insert())
