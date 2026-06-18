import asyncio
import uuid
from app.database import engine, Base, AsyncSessionLocal
from app.models.all_models import User
from app.core.security import get_password_hash

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        # Check if admin already exists
        from sqlalchemy.future import select
        result = await session.execute(select(User).filter(User.email == "admin@agrawalsamaj.com"))
        admin = result.scalars().first()
        if not admin:
            admin = User(
                uuid=str(uuid.uuid4()),
                samaj_id="1000000000000000",
                first_name="Admin",
                last_name="User",
                email="admin@agrawalsamaj.com",
                phone="0000000000",
                password_hash=get_password_hash("admin123"),
                role="ADMIN",
                status="APPROVED",
                approval_status="APPROVED",
                show_phone=False,
                show_email=False,
                show_address=False,
                address_id=1
            )
            from app.models.all_models import Address
            addr = Address(id=1, address_text='Admin HQ')
            session.add(addr)
            session.add(admin)
            await session.commit()
            print("Admin user created successfully!")
        else:
            print("Admin user already exists.")

if __name__ == "__main__":
    asyncio.run(init_db())
