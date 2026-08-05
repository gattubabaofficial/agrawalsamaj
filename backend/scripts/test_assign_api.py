import asyncio
import os
import sys
import uuid
import httpx

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.user import User, UserRole
from app.utils.security import create_access_token
from app.config import settings
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

neon_url = "postgresql+asyncpg://neondb_owner:npg_tnmNUj0B3vDl@ep-ancient-salad-aymdzbjr-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"
neon_url = neon_url.replace("sslmode=require", "ssl=require")

engine = create_async_engine(neon_url)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def test_api():
    async with SessionLocal() as db:
        print("Finding an admin user...")
        result = await db.execute(select(User).where(User.role == UserRole.SUPER_ADMIN))
        admin = result.scalars().first()
        if not admin:
            result = await db.execute(select(User).where(User.role == UserRole.ADMIN))
            admin = result.scalars().first()
            
        if not admin:
            print("No admin user found in database!")
            return
            
        print(f"Found admin: {admin.first_name} {admin.surname} | ID: {admin.user_id} | Role: {admin.role}")
        
        # Generate token
        token = create_access_token(data={"sub": str(admin.user_id), "role": admin.role.value})
        print("Generated Token:", token)
        
        # Make request to Railway backend
        url = "https://agrawalsamaj-backend-production.up.railway.app/api/v1/roles/assign"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        # Assign Yash Garg to Cashier role
        payload = {
            "user_id": "f2fbedee-0970-40de-802b-b16067cf79f7",
            "custom_role_id": "1c0c7f89-4a9d-4d2f-86eb-d97d93bfe86d"
        }
        
        print("\nSending assign role request...")
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, headers=headers)
            print("Status Code:", res.status_code)
            print("Response Headers:", dict(res.headers))
            print("Response Body:", res.text)
            
        # Unassign Yash Garg (custom_role_id = None)
        payload_unassign = {
            "user_id": "f2fbedee-0970-40de-802b-b16067cf79f7",
            "custom_role_id": None
        }
        
        print("\nSending unassign role request...")
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload_unassign, headers=headers)
            print("Status Code:", res.status_code)
            print("Response Headers:", dict(res.headers))
            print("Response Body:", res.text)

if __name__ == "__main__":
    asyncio.run(test_api())
