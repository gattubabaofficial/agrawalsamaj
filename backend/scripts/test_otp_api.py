import asyncio
import httpx

async def test_otp_endpoint():
    url = "https://agrawalsamaj-backend-production.up.railway.app/api/v1/auth/phone/send-otp"
    payload = {"phone": "9414054426"}
    
    print(f"Sending POST to {url} with {payload}...")
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, timeout=20)
            print("Status Code:", res.status_code)
            print("Response Headers:", dict(res.headers))
            print("Response Body:", res.text)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test_otp_endpoint())
