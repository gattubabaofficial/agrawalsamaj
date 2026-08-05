import httpx

payload = {
    "first_name": "Test",
    "surname": "Test",
    "father_name": "Test",
    "parent_relation": "S/o",
    "mobile": "8290909163",
    "otp": "111111"
}

try:
    print("Testing apply-with-otp on Railway live backend...")
    res = httpx.post("https://agrawalsamaj-backend-production.up.railway.app/api/v1/membership/apply-with-otp", json=payload, timeout=10.0)
    print("Railway Status Code:", res.status_code)
    print("Railway Response text:", res.text)
except Exception as e:
    print("Request failed:", e)
