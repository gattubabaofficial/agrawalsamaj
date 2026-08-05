import asyncio
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.database import engine
from app.models.user import User

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(select(User.family_relation).distinct())
        relations = [r[0] for r in res.all() if r[0] is not None]
        print("Unique family relations in DB:")
        print(relations)

if __name__ == "__main__":
    asyncio.run(main())
