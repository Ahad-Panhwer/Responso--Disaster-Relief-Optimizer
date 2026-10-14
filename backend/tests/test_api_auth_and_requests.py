"""
Tests for Responso Auth, Roles, and Assistance Request API Endpoints
"""

import pytest


def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "responso-api"


def test_login_success(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "tariq.mansoor@responso.pk",
        "password": "Password123!",
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "LOGISTICS_COORDINATOR"


def test_login_invalid_credentials(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "tariq.mansoor@responso.pk",
        "password": "WrongPassword!",
    })
    assert res.status_code == 401
    data = res.json()
    assert data["error"]["code"] == "INVALID_CREDENTIALS"


def test_protected_route_missing_token(client):
    res = client.get("/api/v1/requests/")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "MISSING_TOKEN"


def test_protected_route_invalid_token(client):
    res = client.get("/api/v1/requests/", headers={"Authorization": "Bearer not-a-valid-token"})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "INVALID_TOKEN"


def test_role_enforcement_admin_endpoint(client, dispatcher_headers, admin_headers):
    # Dispatcher attempting admin endpoint -> 403 Forbidden
    res = client.get("/api/v1/users/", headers=dispatcher_headers)
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "ADMIN_ONLY"

    # Admin accessing admin endpoint -> 200 OK
    res_admin = client.get("/api/v1/users/", headers=admin_headers)
    assert res_admin.status_code == 200
    users = res_admin.json()
    assert len(users) >= 4


def test_list_requests_and_filter(client, coordinator_headers):
    res = client.get("/api/v1/requests", headers=coordinator_headers)
    assert res.status_code == 200
    requests = res.json()
    assert len(requests) >= 5

    # Filter by urgency
    res_crit = client.get("/api/v1/requests?urgency=CRITICAL", headers=coordinator_headers)
    assert res_crit.status_code == 200
    crit_requests = res_crit.json()
    assert all(r["urgency"] == "CRITICAL" for r in crit_requests)


def test_create_request_success(client, dispatcher_headers):
    new_req = {
        "location": {
            "name": "Mehar Community Hall Shelter",
            "district": "Dadu",
            "tehsil": "Mehar",
            "latitude": 27.18,
            "longitude": 67.82,
            "location_type": "camp",
        },
        "urgency": "CRITICAL",
        "affected_population": 850,
        "affected_households": 140,
        "vulnerable_count": 210,
        "access_status": "BOAT_ONLY",
        "flood_depth_meters": 1.75,
        "contact_person": "Ali Raza Buriro",
        "contact_phone": "+92 300 123-4567",
        "items": [
            {"item_type": "water", "quantity_requested": 2500},
            {"item_type": "food", "quantity_requested": 1200},
            {"item_type": "medical", "quantity_requested": 50},
        ],
        "description": "Critical food and medical shortage due to breach in FP Bund.",
    }

    res = client.post("/api/v1/requests", json=new_req, headers=dispatcher_headers)
    assert res.status_code == 201
    created = res.json()
    assert created["reference_code"].startswith("REQ-")
    assert created["urgency"] == "CRITICAL"
    assert created["status"] == "PENDING"
    assert len(created["items"]) == 3


def test_create_request_validation_rejections(client, dispatcher_headers):
    # 1. Negative population rejected
    bad_req1 = {
        "location": {"name": "Bad Pop Camp", "district": "Dadu"},
        "urgency": "HIGH",
        "affected_population": -50,
        "items": [{"item_type": "water", "quantity_requested": 100}],
    }
    res1 = client.post("/api/v1/requests", json=bad_req1, headers=dispatcher_headers)
    assert res1.status_code == 422

    # 2. Non-positive supply quantity rejected
    bad_req2 = {
        "location": {"name": "Zero Qty Camp", "district": "Dadu"},
        "urgency": "HIGH",
        "affected_population": 100,
        "items": [{"item_type": "water", "quantity_requested": 0}],
    }
    res2 = client.post("/api/v1/requests", json=bad_req2, headers=dispatcher_headers)
    assert res2.status_code == 422

    # 3. Duplicate item types rejected
    bad_req3 = {
        "location": {"name": "Duplicate Item Camp", "district": "Dadu"},
        "urgency": "HIGH",
        "affected_population": 100,
        "items": [
            {"item_type": "water", "quantity_requested": 500},
            {"item_type": "water", "quantity_requested": 300},
        ],
    }
    res3 = client.post("/api/v1/requests", json=bad_req3, headers=dispatcher_headers)
    assert res3.status_code == 422
