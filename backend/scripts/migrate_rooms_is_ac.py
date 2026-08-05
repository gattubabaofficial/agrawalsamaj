"""Run any missing schema migrations on Neon DB."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

neon_url = "postgresql+asyncpg://neondb_owner:npg_tnmNUj0B3vDl@ep-ancient-salad-aymdzbjr-pooler.c-5.us-east-2.aws.neon.tech/neondb?ssl=require"
engine = create_async_engine(neon_url)

async def main():
    # First check current columns in rooms table
    async with engine.begin() as conn:
        res = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'rooms' ORDER BY ordinal_position"
        ))
        cols = [r[0] for r in res.fetchall()]
        print(f"Current rooms columns: {cols}")
        
        is_ac_exists = "is_ac" in cols
        print(f"is_ac exists: {is_ac_exists}")
    
    if not is_ac_exists:
        # Run the migration to add missing columns
        statements = [
            "ALTER TABLE rooms ADD COLUMN is_ac BOOLEAN DEFAULT FALSE",
        ]
        async with engine.begin() as conn:
            for stmt in statements:
                try:
                    print(f"Running: {stmt}")
                    await conn.execute(text(stmt))
                    print("  Success!")
                except Exception as e:
                    print(f"  Error: {e}")
    else:
        print("is_ac already exists in rooms table.")
    
    # Verify final columns
    async with engine.begin() as conn:
        res = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'rooms' ORDER BY ordinal_position"
        ))
        final_cols = [r[0] for r in res.fetchall()]
        print(f"\nFinal rooms columns: {final_cols}")

if __name__ == "__main__":
    asyncio.run(main())
