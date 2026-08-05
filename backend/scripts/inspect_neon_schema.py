import asyncio
import sys
import os
import traceback

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, text
from app.models.user import User
from app.models.requests import MembershipRequest

neon_url = "postgresql+asyncpg://neondb_owner:npg_tnmNUj0B3vDl@ep-ancient-salad-aymdzbjr-pooler.c-5.us-east-2.aws.neon.tech/neondb?ssl=require"
engine = create_async_engine(neon_url)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def check_schema():
    async with SessionLocal() as db:
        # Check user columns
        try:
            print("Querying single user columns from Neon...")
            res = await db.execute(text("SELECT * FROM users LIMIT 1"))
            user_cols = res.keys()
            print("User columns in Neon:", list(user_cols))
            
            # Check membership_requests columns
            res_req = await db.execute(text("SELECT * FROM membership_requests LIMIT 1"))
            req_cols = res_req.keys()
            print("MembershipRequest columns in Neon:", list(req_cols))
            
            # Check family columns
            res_fam = await db.execute(text("SELECT * FROM families LIMIT 1"))
            fam_cols = res_fam.keys()
            print("Family columns in Neon:", list(fam_cols))

        except Exception as e:
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_schema())
