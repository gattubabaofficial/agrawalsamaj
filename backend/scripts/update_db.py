import asyncio
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from sqlalchemy import text

async def update_db():
    async with SessionLocal() as db:
        print("Checking database columns for blogs table...")
        
        # Check existing columns
        try:
            result = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'blogs'"))
            columns = [row[0] for row in result.fetchall()]
            print("Existing columns in 'blogs' table:", columns)
            
            # Add columns if they don't exist
            if 'guest_name' not in columns:
                print("Adding guest_name column...")
                await db.execute(text("ALTER TABLE blogs ADD COLUMN guest_name VARCHAR(200)"))
            if 'guest_email' not in columns:
                print("Adding guest_email column...")
                await db.execute(text("ALTER TABLE blogs ADD COLUMN guest_email VARCHAR(300)"))
            if 'guest_phone' not in columns:
                print("Adding guest_phone column...")
                await db.execute(text("ALTER TABLE blogs ADD COLUMN guest_phone VARCHAR(20)"))
            
            await db.commit()
            print("Database updated successfully!")
            
            # Verify columns after update
            result = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'blogs'"))
            columns = [row[0] for row in result.fetchall()]
            print("Updated columns in 'blogs' table:", columns)
            
        except Exception as e:
            print("Error updating database:", e)

if __name__ == "__main__":
    asyncio.run(update_db())
