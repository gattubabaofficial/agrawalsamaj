import asyncio
import sys
import os
import traceback

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.routers.membership import apply_for_membership_with_otp, ApplyWithOtpRequest

neon_url = "postgresql+asyncpg://neondb_owner:npg_tnmNUj0B3vDl@ep-ancient-salad-aymdzbjr-pooler.c-5.us-east-2.aws.neon.tech/neondb?ssl=require"
engine = create_async_engine(neon_url)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def main():
    async with SessionLocal() as db:
        try:
            payload = ApplyWithOtpRequest(
                first_name="Test",
                surname="Test",
                father_name="Test",
                parent_relation="S/o",
                mobile="8290909163",
                otp="111111"
            )
            print("Simulating apply_for_membership_with_otp...")
            res = await apply_for_membership_with_otp(payload, db)
            print("Result:", res)
        except Exception as e:
            print("Crashed with:")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
