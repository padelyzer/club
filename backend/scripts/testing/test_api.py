#!/usr/bin/env python
"""
Quick API test script for Padelyzer - EMERGENCY RECOVERY VERSION.
Tests basic functionality of the API endpoints.
"""
import json
from datetime import datetime, timedelta

import requests

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
USERNAME = "admin"
password="TEST_PASSWORD"

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def print_test(name, passed=True):
    """Print test result."""
    if passed:
        print(f"{GREEN}✅ {name}{RESET}")
    else:
        print(f"{RED}❌ {name}{RESET}")


def test_api():
    """Test Padelyzer API endpoints."""
    print(f"\n{BLUE}🧪 Testing Padelyzer API...{RESET}\n")

    # Test 1: Login
    print(f"{YELLOW}1. Testing Authentication...{RESET}")
    login_data = {
        "email": "admin@padelyzer.com",  # Using email instead of username
        "password": PASSWORD,
    }

    try:
        response = requests.post(f"{BASE_URL}/auth/login/", json=login_data)
        if response.status_code == 200:
            tokens = response.json()
            access_token = tokens.get("access")
            print_test("Login successful")
            headers = {"Authorization": f"Bearer {access_token}"}
        else:
            print_test("Login failed", False)
            print(f"Response: {response.text}")
            return
    except Exception as e:
        print_test(f"Login error: {e}", False)
        return

    # Test 2: Get Clubs
    print(f"\n{YELLOW}2. Testing Clubs API...{RESET}")
    try:
        response = requests.get(f"{BASE_URL}/clubs/clubs/", headers=headers)
        if response.status_code == 200:
            clubs = response.json()
            print_test(
                f"Get clubs successful - Found {len(clubs.get('results', []))} clubs"
            )
            if clubs.get("results"):
                club = clubs["results"][0]
                club_id = club["id"]
                print(f"   Club: {club['name']}")
        else:
            print_test("Get clubs failed", False)
            return
    except Exception as e:
        print_test(f"Clubs error: {e}", False)
        return

    # Test 3: Get Courts
    print(f"\n{YELLOW}3. Testing Courts API...{RESET}")
    try:
        response = requests.get(f"{BASE_URL}/clubs/courts/", headers=headers)
        if response.status_code == 200:
            courts = response.json()
            print_test(
                f"Get courts successful - Found {len(courts.get('results', []))} courts"
            )
            if courts.get("results"):
                court = courts["results"][0]
                court_id = court["id"]
                print(f"   Court: {court['name']} - ${court['price_per_hour']}/hr")
        else:
            print_test("Get courts failed", False)
    except Exception as e:
        print_test(f"Courts error: {e}", False)

    # Test 4: Check Availability
    print(f"\n{YELLOW}4. Testing Availability Check...{RESET}")
    try:
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        availability_data = {"club": club_id, "date": tomorrow}

        response = requests.post(
            f"{BASE_URL}/reservations/reservations/check_availability/",
            json=availability_data,
            headers=headers,
        )

        if response.status_code == 200:
            availability = response.json()
            print_test("Availability check successful")

            # Find first available slot
            available_slot = None
            for court_data in availability.get("availability", []):
                for slot in court_data.get("slots", []):
                    if slot["is_available"]:
                        available_slot = slot
                        available_court = court_data["court"]["id"]
                        break
                if available_slot:
                    break

            if available_slot:
                print(
                    f"   Found available slot: {available_slot['start_time']} - {available_slot['end_time']}"
                )
        else:
            print_test("Availability check failed", False)
    except Exception as e:
        print_test(f"Availability error: {e}", False)

    # Test 5: Create Reservation
    print(f"\n{YELLOW}5. Testing Reservation Creation...{RESET}")
    try:
        if available_slot:
            reservation_data = {
                "club": club_id,
                "court": available_court,
                "date": tomorrow,
                "start_time": available_slot["start_time"],
                "end_time": available_slot["end_time"],
                "player_name": "Test Player",
                "player_email": "test@example.com",
                "player_phone": "+52 55 1234 5678",
                "player_count": 4,
                "notes": "Test reservation from API",
            }

            response = requests.post(
                f"{BASE_URL}/reservations/reservations/",
                json=reservation_data,
                headers=headers,
            )

            if response.status_code == 201:
                reservation = response.json()
                reservation_id = reservation["id"]
                print_test("Reservation created successfully")
                print(f"   Reservation ID: {reservation_id}")
                print(f"   Total: ${reservation['total_price']}")
            else:
                print_test("Reservation creation failed", False)
                print(f"Response: {response.text}")
        else:
            print_test("No available slots to test reservation", False)
    except Exception as e:
        print_test(f"Reservation error: {e}", False)

    # Test 6: Get Reservations
    print(f"\n{YELLOW}6. Testing Get Reservations...{RESET}")
    try:
        response = requests.get(
            f"{BASE_URL}/reservations/reservations/", headers=headers
        )
        if response.status_code == 200:
            reservations = response.json()
            print_test(
                f"Get reservations successful - Found {len(reservations.get('results', []))} reservations"
            )
        else:
            print_test("Get reservations failed", False)
    except Exception as e:
        print_test(f"Get reservations error: {e}", False)

    # Test 7: Calendar View
    print(f"\n{YELLOW}7. Testing Calendar View...{RESET}")
    try:
        current_month = datetime.now().strftime("%Y-%m")
        response = requests.get(
            f"{BASE_URL}/reservations/reservations/calendar/",
            params={"club": club_id, "month": current_month},
            headers=headers,
        )

        if response.status_code == 200:
            calendar = response.json()
            print_test("Calendar view successful")

            # Count reservations
            total_reservations = sum(
                day["reservation_count"] for day in calendar.values()
            )
            print(f"   Total reservations this month: {total_reservations}")
        else:
            print_test("Calendar view failed", False)
    except Exception as e:
        print_test(f"Calendar error: {e}", False)

    print(f"\n{BLUE}✨ API tests complete!{RESET}\n")


if __name__ == "__main__":
    test_api()
