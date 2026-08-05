"""Test booking creation after saava_dates migration."""
import asyncio
import httpx
import datetime

BASE_URL = "https://agrawalsamaj-backend-production.up.railway.app/api/v1"

async def main():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=25) as client:
        # Login
        resp = await client.post("/auth/login", data={"username": "9876543210", "password": "Admin@123"})
        if resp.status_code != 200:
            print(f"Login failed: {resp.text}")
            return
        token = resp.json()["access_token"]
        print("Logged in!")

        # Get rooms
        rooms = await client.get("/bookings/rooms", headers={"Authorization": f"Bearer {token}"})
        room_list = rooms.json()
        room = room_list[0]
        print(f"Using room: {room['name']} ({room['room_id']})")

        # Test booking (far future to avoid conflicts)
        checkin = (datetime.date.today() + datetime.timedelta(days=90)).isoformat()
        checkout = (datetime.date.today() + datetime.timedelta(days=92)).isoformat()

        booking_resp = await client.post(
            "/bookings/",
            json={
                "room_id": room["room_id"],
                "start_date": checkin,
                "end_date": checkout,
                "payment_mode": "cash",
                "notes": "Purpose: Wedding Saava Days | Agrawal Member: Yes",
                "guest_name": "Test Guest",
                "guest_phone": "8290909163"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"\nBooking create status: {booking_resp.status_code}")
        try:
            data = booking_resp.json()
            if booking_resp.status_code == 201:
                print(f"SUCCESS! Booking ID: {data.get('booking_id')}, Total: {data.get('total_amount')}")
            else:
                print(f"Error: {data}")
        except Exception:
            print(f"Raw: {booking_resp.text[:500]}")

if __name__ == "__main__":
    asyncio.run(main())
