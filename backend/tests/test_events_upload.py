import io
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.main import app
from app.dependencies import get_current_user


async def test_upload_event_image_unauthenticated(client: AsyncClient):
    files = {"file": ("test.png", io.BytesIO(b"fake image bytes"), "image/png")}
    response = await client.post("/api/v1/events/upload", files=files)
    assert response.status_code == 401


async def test_upload_event_image_non_admin(client: AsyncClient, db_session: AsyncSession):
    regular_user = User(
        user_id=uuid.uuid4(),
        mobile="9999999990",
        first_name="Regular",
        surname="User",
        role=UserRole.MEMBER,
        is_active=True
    )
    db_session.add(regular_user)
    await db_session.commit()

    async def _override_get_current_user():
        return regular_user

    app.dependency_overrides[get_current_user] = _override_get_current_user

    try:
        files = {"file": ("test.png", io.BytesIO(b"fake image bytes"), "image/png")}
        response = await client.post("/api/v1/events/upload", files=files)
        assert response.status_code == 403
        assert "Only admins" in response.json()["detail"]
    finally:
        del app.dependency_overrides[get_current_user]


async def test_upload_event_image_admin_success(client: AsyncClient, db_session: AsyncSession):
    admin_user = User(
        user_id=uuid.uuid4(),
        mobile="9999999991",
        first_name="Admin",
        surname="User",
        role=UserRole.ADMIN,
        is_active=True
    )
    db_session.add(admin_user)
    await db_session.commit()

    async def _override_get_current_user():
        return admin_user

    app.dependency_overrides[get_current_user] = _override_get_current_user

    try:
        files = {"file": ("event_banner.png", io.BytesIO(b"fake banner bytes"), "image/png")}
        response = await client.post("/api/v1/events/upload", files=files)
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert data["url"].startswith("/uploads/events/")
        assert data["url"].endswith(".png")
    finally:
        del app.dependency_overrides[get_current_user]


async def test_upload_event_image_invalid_extension(client: AsyncClient, db_session: AsyncSession):
    admin_user = User(
        user_id=uuid.uuid4(),
        mobile="9999999992",
        first_name="Admin",
        surname="User",
        role=UserRole.ADMIN,
        is_active=True
    )
    db_session.add(admin_user)
    await db_session.commit()

    async def _override_get_current_user():
        return admin_user

    app.dependency_overrides[get_current_user] = _override_get_current_user

    try:
        files = {"file": ("malicious.exe", io.BytesIO(b"binary content"), "application/x-msdownload")}
        response = await client.post("/api/v1/events/upload", files=files)
        assert response.status_code == 400
        assert "Invalid file format" in response.json()["detail"]
    finally:
        del app.dependency_overrides[get_current_user]
