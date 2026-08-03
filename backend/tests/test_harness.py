"""Proves the test database is actually isolated from test.db.

Both DB dependencies must be overridden — see the docstring on the `client`
fixture. Without both, these routes read the developer's real database and
every later test silently asserts against the wrong data.
"""

from httpx import AsyncClient


async def test_membership_route_sees_the_empty_test_database(client: AsyncClient):
    """membership.py uses get_db_session."""
    response = await client.get("/api/v1/membership/members")
    assert response.status_code == 200
    assert response.json() == [], (
        "Expected no members in the fresh test database. Non-empty means the "
        "get_db_session override is missing and this hit the real test.db."
    )


async def test_events_route_sees_the_empty_test_database(client: AsyncClient):
    """events.py uses get_db."""
    response = await client.get("/api/v1/events")
    assert response.status_code == 200
    assert response.json() == [], (
        "Expected no events in the fresh test database. Non-empty means the "
        "get_db override is missing and this hit the real test.db."
    )
