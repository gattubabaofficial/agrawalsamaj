import os
import aiohttp


def is_dummy_sms_mode() -> bool:
    """True when send_sms would only print to the console instead of sending.

    Callers that need to know whether a message actually left the machine must
    check this: send_sms returns True in dummy mode, so a bare `if await
    send_sms(...)` cannot tell real delivery from a console print. That
    distinction is the difference between "your code is on its way" and a user
    staring at a screen that will never receive anything.
    """
    provider = os.getenv("SMS_PROVIDER", "msg91").lower()

    if provider == "dummy":
        return True
    if provider == "msg91":
        key = os.getenv("SMS_API_KEY")
        return not key or key == "dummy_key"
    if provider == "twilio":
        sid = os.getenv("TWILIO_ACCOUNT_SID")
        return not sid or sid == "dummy_sid" or "your_" in sid
    if provider == "2factor":
        key = os.getenv("SMS_API_KEY")
        return not os.getenv("TWOFACTOR_API_KEY") and (not key or key == "dummy_key")
    return False


async def send_sms(phone: str, message: str) -> bool:
    """
    Sends an SMS using the configured SMS provider.
    Fallback to console logging if dummy/development mode is active.
    """
    provider = os.getenv("SMS_PROVIDER", "msg91").lower()

    if is_dummy_sms_mode():
        # Simulate SMS sending in development
        print(f"\n==========================================")
        print(f"[DUMMY SMS DISPATCHED]")
        print(f"To: {phone}")
        print(f"Message: {message}")
        print(f"==========================================\n")
        return True

    elif provider == "msg91":
        api_key = os.getenv("SMS_API_KEY")
        sender_id = os.getenv("SMS_SENDER_ID", "SAMAJ")
        
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

    elif provider == "2factor":
        api_key = os.getenv("TWOFACTOR_API_KEY") or os.getenv("SMS_API_KEY")
        template_name = os.getenv("TWOFACTOR_TEMPLATE_NAME")
        
        if not api_key or api_key == "dummy_key":
            print("2Factor API key not configured in environment.")
            return False
            
        import re
        otp_match = re.search(r'\b\d{6}\b', message)
        otp_code = otp_match.group(0) if otp_match else "000000"
        
        clean_phone = re.sub(r'\D', '', phone)
        if len(clean_phone) == 10:
            clean_phone = f"91{clean_phone}"
            
        if template_name:
            url = f"https://2factor.in/API/V1/{api_key}/SMS/{clean_phone}/{otp_code}/{template_name}"
        else:
            url = f"https://2factor.in/API/V1/{api_key}/SMS/{clean_phone}/{otp_code}"
            
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as response:
                    res_json = await response.json()
                    if response.status == 200 and res_json.get("Status") == "Success":
                        return True
                    else:
                        print(f"2Factor API Error: {res_json}")
                        return False
        except Exception as e:
            print(f"Failed to send SMS via 2Factor: {e}")
            return False

    elif provider == "android_gateway":
        gateway_url = os.getenv("SMS_GATEWAY_URL")
        if not gateway_url:
            print("SMS_GATEWAY_URL not set in environment.")
            return False
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "to": phone,
                    "message": message
                }
                async with session.post(gateway_url, json=payload, timeout=5) as response:
                    if response.status in [200, 201, 202]:
                        return True
                    else:
                        import urllib.parse
                        params = urllib.parse.urlencode({"phone": phone, "message": message})
                        separator = "&" if "?" in gateway_url else "?"
                        url = f"{gateway_url}{separator}{params}"
                        async with session.get(url, timeout=5) as get_response:
                            return get_response.status in [200, 201, 202]
        except Exception as e:
            print(f"Failed to send SMS via Android Gateway: {e}")
            return False

    elif provider == "twilio":
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        from_number = os.getenv("TWILIO_PHONE_NUMBER")
        
        if not account_sid or not auth_token or not from_number:
            print("Twilio credentials not fully set up in environment.")
            return False
            
        try:
            from twilio.rest import Client
            client = Client(account_sid, auth_token)
            
            # Ensure target number starts with + and has country code
            to_number = phone
            if not to_number.startswith("+"):
                if len(to_number) == 10:
                    to_number = f"+91{to_number}"
                else:
                    to_number = f"+{to_number}"
                    
            client.messages.create(
                body=message,
                from_=from_number,
                to=to_number
            )
            return True
        except Exception as e:
            print(f"Failed to send SMS via Twilio: {e}")
            return False

    return False
