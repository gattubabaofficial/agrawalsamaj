import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

neon_url = "postgresql+asyncpg://neondb_owner:npg_tnmNUj0B3vDl@ep-ancient-salad-aymdzbjr-pooler.c-5.us-east-2.aws.neon.tech/neondb?ssl=require"
engine = create_async_engine(neon_url)

async def main():
    statements = [
        "ALTER TABLE users ADD COLUMN parent_relation VARCHAR(20)",
        "ALTER TABLE rooms ADD COLUMN is_ac BOOLEAN DEFAULT FALSE",
        "ALTER TABLE event_passes ADD COLUMN cancelled_by VARCHAR(36)",
        "ALTER TABLE event_passes ADD COLUMN cancelled_at TIMESTAMP",
        "ALTER TABLE event_passes ADD COLUMN cancel_reason VARCHAR(500)",
        "ALTER TABLE event_passes ADD COLUMN refund_amount NUMERIC(10, 2)",
        "ALTER TABLE event_passes ADD COLUMN refund_status VARCHAR(30) DEFAULT 'not_applicable'",
    ]
    async with engine.begin() as conn:
        for stmt in statements:
            try:
                print(f"Executing on Neon: {stmt}")
                await conn.execute(text(stmt))
                print("Success")
            except Exception as e:
                print("Failed:", e)

if __name__ == "__main__":
    asyncio.run(main())
