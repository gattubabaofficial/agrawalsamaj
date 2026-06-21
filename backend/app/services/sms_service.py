import os
import aiohttp

async def send_sms(phone: str, message: str) -> bool:
    """
    Sends an SMS using the configured SMS provider.
    Fallback to console logging if dummy/development mode is active.
    """
    provider = os.getenv("SMS_PROVIDER", "msg91").lower()
    
    if provider == "dummy" or os.getenv("SMS_API_KEY") == "dummy_key":
        # Simulate SMS sending in development
        print(f"\n==========================================")
        print(f"📡 DUMMY SMS DISPATCHED")
        print(f"📱 To: {phone}")
        print(f"💬 Message: {message}")
        print(f"==========================================\n")
        return True

    elif provider == "msg91":
        api_key = os.getenv("SMS_API_KEY")
        sender_id = os.getenv("SMS_SENDER_ID", "SAMAJ")
        
        # Example implementation for MSG91 (Replace with actual MSG91 endpoint/payload as per their docs)
        url = "https://api.msg91.com/api/v5/flow/"
        headers = {
            "authkey": api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "sender": sender_id,
            "route": "4",
            "country": "91",
            "sms": [
                {
                    "message": message,
                    "to": [phone.replace("+91", "").replace("+", "")]
                }
            ]
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, headers=headers) as response:
                    if response.status in [200, 201, 202]:
                        return True
                    else:
                        print(f"SMS Provider Error: {await response.text()}")
                        return False
        except Exception as e:
            print(f"Failed to send SMS via MSG91: {e}")
            return False

    elif provider == "twilio":
        # Add twilio implementation if needed later
        pass

    return False
