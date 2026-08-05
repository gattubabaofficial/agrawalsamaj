"""Test room creation via live API after migration."""
import asyncio
import httpx

BASE_URL = "https://agrawalsamaj-backend-production.up.railway.app/api/v1"

async def main():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=20) as client:
        # Login as Rajesh Sharma (real admin)
        resp = await client.post("/auth/login", data={"username": "9876543210", "password": "Admin@123"})
        print(f"Login: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Login failed: {resp.text}")
            return
        token = resp.json()["access_token"]
        print(f"Token: {token[:30]}...")

        # Try room creation
        room_resp = await client.post(
            "/bookings/rooms",
            json={
                "name": "Test Hall",
                "type": "hall",
                "room_number": "H-1",
                "floor": "Ground",
                "capacity": 200,
                "price_per_day": 5000.0,
                "description": "Main hall for events",
                "amenities": {"features": ["ac", "projector"]}
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"\nRoom create status: {room_resp.status_code}")
        try:
            print(f"Room create response: {room_resp.json()}")
        except Exception:
            print(f"Raw: {room_resp.text[:500]}")

if __name__ == "__main__":
    asyncio.run(main())
