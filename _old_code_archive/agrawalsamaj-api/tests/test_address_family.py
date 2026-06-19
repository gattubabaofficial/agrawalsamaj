import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
import uuid

from app.main import app
from app.database import get_db, Base
from app.core.dependencies import get_current_user
from app.models.all_models import User, Address

class MockUser:
    def __init__(self, samaj_id, role, address_id=None, family_id=None):
        self.samaj_id = samaj_id
        self.uuid = str(uuid.uuid4())
        self.role = role
        self.status = "APPROVED"
        self.address_id = address_id
        self.family_id = family_id

MOCK_USER = MockUser(samaj_id="SAMTEST123456789", role="MEMBER")

async def override_get_current_user():
    # Return the actual DB user so modifications affect the session
    async with TestingSessionLocal() as db:
        result = await db.execute(select(User).filter(User.samaj_id == MOCK_USER.samaj_id))
        user = result.scalars().first()
        return user

SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession, expire_on_commit=False)

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as db:
        user = User(
            samaj_id=MOCK_USER.samaj_id,
            uuid=MOCK_USER.uuid,
            password_hash="hashed",
            first_name="Test",
            last_name="User",
            email="test@example.com",
            phone="1234567890",
            role=MOCK_USER.role,
            status=MOCK_USER.status
        )
        db.add(user)
        await db.commit()
        
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.mark.asyncio
async def test_update_user_address():
    payload = {
        "address_text": "123 Main St",
        "colony": "Agrawal Nagar",
        "area": "Downtown",
        "city": "Indore",
        "state": "MP",
        "pincode": "452001"
    }
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.put("/api/v1/users/me/address", json=payload)
        assert response.status_code == 200, f"Error: {response.text}"
        data = response.json()
        assert data["message"] == "Address updated successfully"
    
    async with TestingSessionLocal() as db:
        result = await db.execute(select(Address).filter(Address.address_text == "123 Main St"))
        address = result.scalars().first()
        assert address is not None
        assert address.colony == "Agrawal Nagar"

@pytest.mark.asyncio
async def test_register_family():
    payload = {
        "family_name": "Agrawal Family"
    }
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/v1/family/register", json=payload)
        assert response.status_code == 200, f"Error: {response.text}"
        data = response.json()
        assert data["family_name"] == "Agrawal Family"
        assert "family_code" in data
