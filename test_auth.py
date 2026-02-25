import requests
import time

BASE_URL = "http://localhost:8000"

def test_auth_flow():
    print("Testing Auth Flow...")
    
    # 1. Signup Organiser
    org_res = requests.post(f"{BASE_URL}/api/auth/signup", json={
        "email": "org@example.com",
        "password": "password123",
        "full_name": "Org User"
    })
    print("Signup Organiser:", org_res.status_code)
    
    # 2. Login Organiser
    login_res = requests.post(f"{BASE_URL}/api/auth/login", data={
        "username": "org@example.com",
        "password": "password123"
    })
    print("Login Organiser:", login_res.status_code)
    org_token = login_res.json()["access_token"]
    org_headers = {"Authorization": f"Bearer {org_token}"}
    
    # 3. Create Program
    prog_res = requests.post(f"{BASE_URL}/api/programs", headers=org_headers, json={
        "name": "Test Program",
        "start_date": "2026-06-01",
        "end_date": "2026-06-05"
    })
    print("Create Program:", prog_res.status_code)
    program_id = prog_res.json()["id"]
    
    # 4. Create Event as Organiser
    event_res = requests.post(f"{BASE_URL}/api/events", headers=org_headers, json={
        "program_id": program_id,
        "name": "Opening Keynote",
        "duration": 60,
        "expectedParticipants": 100,
        "priority": 1,
        "domain": "General"
    })
    print("Create Event (Organiser):", event_res.status_code)
    
    print("\nTests completed.")

if __name__ == "__main__":
    test_auth_flow()
