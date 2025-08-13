#!/usr/bin/env python
"""Check organization response structure."""
import json

import requests

# Login as ROOT
response = requests.post(
    "http://localhost:9200/api/v1/auth/login/",
    json={"email": "root@padelyzer.com", "password": "TEST_PASSWORD"},
)

if response.status_code == 200:
    token = response.json().get("access")
    headers = {"Authorization": f"Bearer {token}"}

    # Get organizations
    response = requests.get(
        "http://localhost:9200/api/v1/root/organizations/", headers=headers
    )
    if response.status_code == 200:
        orgs = response.json()
        print("Organizations response structure:")
        print(json.dumps(orgs, indent=2))

        if orgs.get("results"):
            print("\nFirst organization structure:")
            print(json.dumps(orgs["results"][0], indent=2))
else:
    print("Login failed:", response.status_code)
