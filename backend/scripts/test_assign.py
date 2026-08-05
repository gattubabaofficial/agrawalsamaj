import asyncio
import os
import sys
import uuid

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.user import User
from app.models.role import CustomRole
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

neon_url = "postgresql+asyncpg://neondb_owner:npg_tnmNUj0B3vDl@ep-ancient-salad-aymdzbjr-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"
neon_url = neon_url.replace("sslmode=require", "ssl=require")

engine = create_async_engine(neon_url)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def test_unassign():
    async with SessionLocal() as db:
        print("Starting test...")
        user_uuid = uuid.UUID("f2fbedee-0970-40de-802b-b16067cf79f7")
        user = await db.get(User, user_uuid)
        if not user:
            print("User not found!")
            return
            
        print(f"Before unassign: user custom_role_id = {user.custom_role_id}")
        
        try:
            # Let's set it to None and try to commit
            user.custom_role_id = None
            await db.commit()
            print("Successfully committed None to custom_role_id!")
            
            # Let's refresh and print it again
            await db.refresh(user)
            print(f"After unassign: user custom_role_id = {user.custom_role_id}")
            
            # Now let's restore it so we don't break user's state
            role_uuid = uuid.UUID("1c0c7f89-4a9d-4d2f-86eb-d97d93bfe86d")
            user.custom_role_id = role_uuid
            await db.commit()
            print("Restored role back to Cashier successfully!")
            
        except Exception as e:
            print("Error occurred:")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_unassign())
