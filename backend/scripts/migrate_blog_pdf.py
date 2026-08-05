import asyncio
import sys
import os
import traceback

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

neon_url = "postgresql+asyncpg://neondb_owner:npg_tnmNUj0B3vDl@ep-ancient-salad-aymdzbjr-pooler.c-5.us-east-2.aws.neon.tech/neondb?ssl=require"
engine = create_async_engine(neon_url)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession)

async def migrate():
    async with SessionLocal() as db:
        try:
            print("Adding pdf_url to blogs table in Neon database...")
            await db.execute(text("ALTER TABLE blogs ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(500) DEFAULT NULL;"))
            await db.commit()
            print("Successfully added pdf_url column to blogs table.")
            
            # Verify columns of blogs
            res = await db.execute(text("SELECT * FROM blogs LIMIT 1"))
            print("Blogs columns in Neon database:", list(res.keys()))
        except Exception as e:
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(migrate())
