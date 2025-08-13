#!/usr/bin/env python3
"""
Test script to validate complete reservation creation flow
including client search and visitor functionality.
"""

import json
import requests
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000/api/v1"

def test_reservation_flow():
    """Test complete reservation flow."""
    
    print("🚀 Testing complete reservation creation flow...")
    
    # Step 1: Use existing token
    print("\n1. Using existing auth token...")
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU0MzgxNzc1LCJpYXQiOjE3NTQzNzgxNzUsImp0aSI6IjNjNzE4ZTE5MDU0YjQ1ZTRhMTk3YTU1MWUzMTg4N2RjIiwidXNlcl9pZCI6MTE2fQ.S5gxru0CA3XN1ODldb7o5lyzJPmK0I7j03qnMhWqZBI"
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test token validity
    test_response = requests.get(f"{BASE_URL}/auth/profile/", headers=headers)
    if test_response.status_code != 200:
        print(f"❌ Token invalid: {test_response.status_code}")
        return False
    
    print("✅ Token valid")
    
    # Step 2: Get existing reservations to extract club and court info
    print("\n2. Getting existing reservations to identify club and court...")
    reservations_response = requests.get(f"{BASE_URL}/reservations/reservations/", headers=headers, params={"page_size": 1})
    
    if reservations_response.status_code != 200:
        print(f"❌ Failed to get reservations: {reservations_response.status_code}")
        return False
        
    reservations = reservations_response.json()["results"]
    if not reservations:
        print("❌ No existing reservations found to extract club/court info")
        return False
        
    reservation = reservations[0]
    club_id = reservation["club"]
    court_id = reservation["court"]
    print(f"✅ Using club ID: {club_id}")
    print(f"✅ Using court ID: {court_id}")
    
    # Step 3: Test client search (might not be available for this user)
    print("\n3. Testing client search by phone...")
    search_response = requests.get(
        f"{BASE_URL}/clients/client-profiles/search_by_phone/",
        params={"phone": "123"},
        headers=headers
    )
    
    client_id = None
    if search_response.status_code == 200:
        clients = search_response.json()
        if clients:
            client = clients[0]
            client_id = client["id"]
            client_name = f"{client['user']['first_name']} {client['user']['last_name']}"
            print(f"✅ Found client: {client_name} (ID: {client_id})")
        else:
            print("ℹ️ No clients found with phone '123'")
    else:
        print(f"⚠️ Client search not available (status {search_response.status_code}) - will test with visitor only")
    
    # Step 4: Create reservation for visitor (main test)
    print(f"\n4. Creating reservation for visitor...")
    tomorrow = (datetime.now() + timedelta(days=1)).date()
    
    visitor_reservation_data = {
        "club": club_id,
        "court": court_id,
        # No client field - this is a visitor
        "date": tomorrow.isoformat(),
        "start_time": "12:00",
        "end_time": "13:00",
        "player_name": "Juan Visitante",
        "player_email": "juan.visitante@example.com",
        "player_phone": "+56987654321",
        "player_count": 2,
        "notes": "Test reservation for visitor"
    }
    
    visitor_response = requests.post(
        f"{BASE_URL}/reservations/reservations/",
        json=visitor_reservation_data,
        headers=headers
    )
    
    if visitor_response.status_code == 201:
        visitor_reservation = visitor_response.json()
        print(f"✅ Visitor reservation created:")
        print(f"   - ID: {visitor_reservation['id']}")
        print(f"   - Player name: {visitor_reservation['player_name']}")
        print(f"   - Player email: {visitor_reservation['player_email']}")
        print(f"   - Player phone: {visitor_reservation['player_phone']}")
        print(f"   - Client name: {visitor_reservation.get('client_name', 'None (visitor)')}")
    else:
        print(f"❌ Failed to create visitor reservation: {visitor_response.status_code}")
        print(visitor_response.text)
    
    # Step 5: List recent reservations to verify
    print(f"\n5. Verifying reservations...")
    list_response = requests.get(
        f"{BASE_URL}/reservations/reservations/",
        params={"ordering": "-created_at", "page_size": 5},
        headers=headers
    )
    
    if list_response.status_code == 200:
        reservations = list_response.json()["results"]
        print(f"✅ Recent reservations:")
        for reservation in reservations[:3]:
            client_type = "Client" if reservation.get('client_name') else "Visitor"
            print(f"   - {client_type}: {reservation['player_name']} on {reservation['date']} at {reservation['start_time']}")
    else:
        print(f"❌ Failed to get reservations: {list_response.status_code}")
    
    print(f"\n🎉 Reservation flow test completed!")
    return True

if __name__ == "__main__":
    try:
        test_reservation_flow()
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()