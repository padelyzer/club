import requests
import json

print("=== TESTING LOGIN API DIRECTLY ===")

# Test data
login_data = {
    "email": "admin@padelyzer.com",
    "password": "TEST_PASSWORD",
    "device_type": "web"
}

print(f"\nSending: {json.dumps(login_data, indent=2)}")

# Make request
response = requests.post(
    "http://localhost:8000/api/v1/auth/login/",
    json=login_data,
    headers={"Content-Type": "application/json"}
)

print(f"\nStatus Code: {response.status_code}")
print(f"Headers: {dict(response.headers)}")
print(f"\nResponse:")
print(json.dumps(response.json(), indent=2))