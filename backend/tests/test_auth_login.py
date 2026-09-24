import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User, UserRole, PhoneOTPRequest
from app.models.role import CustomRole
from app.utils.security import hash_password
from app.routers.auth import hash_otp
from datetime import datetime, timedelta

@pytest.mark.asyncio
async def test_admin_login_success(client: AsyncClient, db_session: AsyncSession):
    admin = User(
        first_name="Admin",
        surname="User",
        email="admin@agrawalsamaj.org",
        password_hash=hash_password("Admin@123"),
        role=UserRole.ADMIN,
        is_member=True,
        is_active=True,
    )
    db_session.add(admin)
    await db_session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "admin@agrawalsamaj.org", "password": "Admin@123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"
    assert data["first_name"] == "Admin"


@pytest.mark.asyncio
async def test_member_custom_role_login(client: AsyncClient, db_session: AsyncSession):
    custom_role = CustomRole(
        name="Receipt Manager",
        description="Can manage receipts",
        permissions=["receipts.create", "receipts.view"]
    )
    db_session.add(custom_role)
    await db_session.flush()

    coordinator = User(
        first_name="Coordinator",
        surname="Sharma",
        mobile="9876543210",
        email="coord@agrawalsamaj.org",
        password_hash=hash_password("Coord@123"),
        role=UserRole.MEMBER,
        custom_role_id=custom_role.role_id,
        is_member=True,
        is_active=True,
    )
    db_session.add(coordinator)
    await db_session.commit()

    # Login via email
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "coord@agrawalsamaj.org", "password": "Coord@123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["custom_role_id"] == str(custom_role.role_id)
    assert data["custom_role"]["name"] == "Receipt Manager"
    assert "receipts.create" in data["custom_role"]["permissions"]

    # Login via mobile number with password
    response_mob = await client.post(
        "/api/v1/auth/login",
        data={"username": "9876543210", "password": "Coord@123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response_mob.status_code == 200
    assert response_mob.json()["role"] == "MEMBER"


@pytest.mark.asyncio
async def test_otp_verification_flow(client: AsyncClient, db_session: AsyncSession):
    member = User(
        first_name="Sanjay",
        surname="Agrawal",
        mobile="9811122233",
        role=UserRole.MEMBER,
        is_member=True,
        is_active=True,
    )
    db_session.add(member)
    await db_session.flush()

    # Create OTP request
    otp_code = "654321"
    otp_req = PhoneOTPRequest(
        phone="9811122233",
        otp_hash=hash_otp(otp_code),
        purpose="login",
        verified=False,
        attempts=0,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db_session.add(otp_req)
    await db_session.commit()

    # Verify OTP
    response = await client.post(
        "/api/v1/auth/phone/verify-otp",
        json={"phone": "9811122233", "otp": "654321"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "MEMBER"
    assert data["first_name"] == "Sanjay"
