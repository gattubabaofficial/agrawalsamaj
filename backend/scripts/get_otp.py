import httpx

res = httpx.post("http://localhost:8000/api/v1/auth/phone/send-otp", json={"phone": "9000000001"})
print(res.status_code)
print(res.text)
