import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from sqlalchemy import select
from app.models.user import EmailOTPRequest, PhoneOTPRequest

async def main():
    try:
        async with SessionLocal() as db:
            email_res = await db.execute(select(EmailOTPRequest))
            email_rows = email_res.scalars().all()
            print(f"Total email OTP requests: {len(email_rows)}")
            for row in email_rows:
                print(f"Email: {row.email} | Created At: {row.created_at} | Verified: {row.verified}")
            
            phone_res = await db.execute(select(PhoneOTPRequest))
            phone_rows = phone_res.scalars().all()
            print(f"Total phone OTP requests: {len(phone_rows)}")
            for row in phone_rows:
                print(f"Phone: {row.phone} | Created At: {row.created_at} | Verified: {row.verified}")
    except Exception as e:
        print("Error:", e)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
