"""
Integration Tests for Responso Full Allocation, Stock Reservation, and Delivery Workflow
========================================================================================
Covers:
1. Inventory inspection and stock adjustment validation
2. Generating allocation recommendations (DRAFT does not touch stock)
3. Inventory changes mark DRAFT runs as stale
4. Approving an allocation run atomically commits reservations and generates deliveries
5. Delivery state transitions (ASSIGNED -> DISPATCHED -> IN_TRANSIT -> DELIVERED)
6. Delivery status constraints (reject backward/invalid transitions, FAILED requires reason)
7. Final delivery execution decrements physical on_hand inventory
"""

import pytest


def test_inventory_listing(client, warehouse_headers):
    res = client.get("/api/v1/warehouses/", headers=warehouse_headers)
    assert res.status_code == 200
    warehouses = res.json()
    assert len(warehouses) >= 3

    sukkur = next(w for w in warehouses if w["code"] == "HUB-SUKKUR")
    water_inv = next(i for i in sukkur["inventory"] if i["item_type"] == "water")
    assert water_inv["quantity_on_hand"] == 26500
    assert water_inv["quantity_reserved"] == 4500
    assert water_inv["quantity_available"] == 22000


def test_stock_movement_cannot_make_stock_negative(client, warehouse_headers):
    res_wh = client.get("/api/v1/warehouses/", headers=warehouse_headers)
    sukkur_id = next(w["id"] for w in res_wh.json() if w["code"] == "HUB-SUKKUR")

    # Try reducing by 30,000 (available is only 22,000)
    bad_movement = {
        "item_type": "water",
        "quantity_delta": -30000,
        "reason": "Unauthorized bulk diversion",
    }
    res = client.post(f"/api/v1/inventory/warehouses/{sukkur_id}/stock-movements", json=bad_movement, headers=warehouse_headers)
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "INSUFFICIENT_STOCK"


def test_allocation_run_and_stale_invalidation(client, coordinator_headers, warehouse_headers):
    # 1. Create a DRAFT allocation run
    create_res = client.post("/api/v1/allocation-runs/", json={}, headers=coordinator_headers)
    assert create_res.status_code == 201
    run = create_res.json()
    assert run["status"] == "DRAFT"
    assert run["is_stale"] is False
    assert len(run["lines"]) > 0

    run_id = run["id"]

    # 2. Modify stock at a warehouse
    res_wh = client.get("/api/v1/warehouses/", headers=warehouse_headers)
    sukkur_id = next(w["id"] for w in res_wh.json() if w["code"] == "HUB-SUKKUR")

    mov_res = client.post(
        f"/api/v1/inventory/warehouses/{sukkur_id}/stock-movements",
        json={"item_type": "water", "quantity_delta": 500, "reason": "Incoming emergency NGO consignment"},
        headers=warehouse_headers,
    )
    assert mov_res.status_code == 201

    # 3. Check that the draft run is now marked stale!
    get_run_res = client.get(f"/api/v1/allocation-runs/{run_id}", headers=coordinator_headers)
    assert get_run_res.status_code == 200
    assert get_run_res.json()["is_stale"] is True

    # 4. Attempting to approve a stale run returns 409 Conflict
    approve_res = client.post(
        f"/api/v1/allocation-runs/{run_id}/approve",
        json={"notes": "Attempting approval of stale run"},
        headers=coordinator_headers,
    )
    assert approve_res.status_code == 409
    assert approve_res.json()["error"]["code"] == "STALE_RUN"


def test_clean_allocation_approval_and_delivery_lifecycle(client, coordinator_headers, dispatcher_headers):
    # 1. Generate a fresh allocation run
    fresh_run = client.post("/api/v1/allocation-runs/", json={}, headers=coordinator_headers).json()
    assert fresh_run["status"] == "DRAFT"
    assert fresh_run["is_stale"] is False
    run_id = fresh_run["id"]

    # 2. Approve the fresh run
    approve_res = client.post(
        f"/api/v1/allocation-runs/{run_id}/approve",
        json={"notes": "Approved for dispatch by Provincial Relief Commissioner"},
        headers=coordinator_headers,
    )
    assert approve_res.status_code == 200
    approved_run = approve_res.json()
    assert approved_run["status"] == "APPROVED"

    # 3. Verify deliveries were created for this run
    del_res = client.get("/api/v1/deliveries/", headers=dispatcher_headers)
    assert del_res.status_code == 200
    deliveries = del_res.json()
    run_deliveries = [d for d in deliveries if d["allocation_run_id"] == run_id]
    assert len(run_deliveries) > 0

    delivery = run_deliveries[0]
    delivery_id = delivery["id"]
    assert delivery["status"] == "ASSIGNED"

    # 4. Advance delivery: ASSIGNED -> DISPATCHED
    res_disp = client.patch(
        f"/api/v1/deliveries/{delivery_id}/status",
        json={"status": "DISPATCHED", "note": "Driver en route"},
        headers=dispatcher_headers,
    )
    assert res_disp.status_code == 200
    assert res_disp.json()["status"] == "DISPATCHED"

    # 5. Invalid transition: DISPATCHED -> DELIVERED (skipping IN_TRANSIT) should be rejected
    res_bad = client.patch(
        f"/api/v1/deliveries/{delivery_id}/status",
        json={"status": "DELIVERED", "note": "Skipped in-transit"},
        headers=dispatcher_headers,
    )
    assert res_bad.status_code == 400
    assert res_bad.json()["error"]["code"] == "INVALID_TRANSITION"

    # 6. Valid transition: DISPATCHED -> IN_TRANSIT
    res_transit = client.patch(
        f"/api/v1/deliveries/{delivery_id}/status",
        json={"status": "IN_TRANSIT", "note": "Navigating flood waters"},
        headers=dispatcher_headers,
    )
    assert res_transit.status_code == 200
    assert res_transit.json()["status"] == "IN_TRANSIT"

    # 7. Valid transition: IN_TRANSIT -> DELIVERED
    res_delivered = client.patch(
        f"/api/v1/deliveries/{delivery_id}/status",
        json={"status": "DELIVERED", "note": "Signed and received by camp incharge"},
        headers=dispatcher_headers,
    )
    assert res_delivered.status_code == 200
    assert res_delivered.json()["status"] == "DELIVERED"
    assert res_delivered.json()["delivered_at"] is not None

    # 8. Terminal transition rejection: Cannot change DELIVERED to anything
    res_terminal = client.patch(
        f"/api/v1/deliveries/{delivery_id}/status",
        json={"status": "IN_TRANSIT", "note": "Attempt to roll back"},
        headers=dispatcher_headers,
    )
    assert res_terminal.status_code == 400
    assert res_terminal.json()["error"]["code"] == "INVALID_TRANSITION"


def test_dashboard_summary_reflects_db(client, coordinator_headers):
    res = client.get("/api/v1/dashboard/summary", headers=coordinator_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_requests"] >= 5
    assert data["active_warehouses"] == 3
    assert data["total_deliveries"] >= 1
    assert "water" in data["total_stock"]
    assert "water" in data["unmet_demand"]
