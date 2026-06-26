import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from sqlalchemy import text
from app.models.user import User, OtpLog, EmailOTPRequest, PhoneOTPRequest

async def main():
    try:
        async with SessionLocal() as db:
            # 1. Simple test query
            res = await db.execute(text('SELECT 1'))
            print("DB basic query success:", res.all())
            
            # 2. Query users table
            from sqlalchemy import select
            user_count = await db.execute(select(User))
            print("Users count query success:", len(user_count.scalars().all()))
            
            # 3. Query OtpLog
            otp_log_count = await db.execute(select(OtpLog))
            print("OtpLog query success:", len(otp_log_count.scalars().all()))

            # 4. Query EmailOTPRequest
            email_otp_count = await db.execute(select(EmailOTPRequest))
            print("EmailOTPRequest query success:", len(email_otp_count.scalars().all()))

            # 5. Query PhoneOTPRequest
            phone_otp_count = await db.execute(select(PhoneOTPRequest))
            print("PhoneOTPRequest query success:", len(phone_otp_count.scalars().all()))

    except Exception as e:
        print("Database test error:", e)
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
