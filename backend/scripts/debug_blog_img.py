import asyncio
from sqlalchemy import select
from app.database import SessionLocal
from app.models.blog import Blog

async def debug():
    async with SessionLocal() as db:
        res = await db.execute(select(Blog))
        blogs = res.scalars().all()
        print(f"Total blogs in DB: {len(blogs)}")
        for b in blogs:
            print(f"ID: {b.blog_id} | Title: {b.title} | Cover Image URL: {b.cover_image_url}")

if __name__ == "__main__":
    asyncio.run(debug())
