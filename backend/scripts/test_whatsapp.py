import asyncio
import os
import sys
import httpx

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings
from app.services.whatsapp_service import send_whatsapp_text

async def test_send():
    print("Settings:")
    print("WHATSAPP_WEB_URL:", settings.WHATSAPP_WEB_URL)
    print("WHATSAPP_WEB_API_KEY:", settings.WHATSAPP_WEB_API_KEY)
    print("WHATSAPP_PROVIDER:", getattr(settings, "WHATSAPP_PROVIDER", "whatsapp_web"))
    
    # Try sending to 918000556113
    phone = "918000556113"
    message = "Test message from Agrawal Samaj backend server diagnostic."
    
    print(f"\nSending message to {phone} via send_whatsapp_text...")
    try:
        # Call it directly to check what it returns
        result = send_whatsapp_text(phone, message)
        print("Result:", result)
        
        # Also let's try direct http request to sidecar to get detailed response body
        headers = {"Content-Type": "application/json"}
        if settings.WHATSAPP_WEB_API_KEY:
            headers["x-api-key"] = settings.WHATSAPP_WEB_API_KEY
            
        url = f"{settings.WHATSAPP_WEB_URL.rstrip('/')}/send-text"
        payload = {"phone": phone, "message": message}
        
        print("\nSending direct POST to sidecar...")
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=10)
            print("HTTP Status Code:", response.status_code)
            print("Response Headers:", dict(response.headers))
            print("Response Body:", response.text)
            
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test_send())
