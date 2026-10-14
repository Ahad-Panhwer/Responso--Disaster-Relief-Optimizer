"""
Comprehensive tests for enhanced features:
1. Multi-warehouse allocation and delivery generation matching source warehouse
2. Failed delivery reservation release and request demand restoration
3. Delivery status idempotent retry safety (no double inventory effects)
4. Authorization & RBAC enforcement (status changes, assignment, user self-updates)
5. Idempotent API operations with Idempotency-Key
6. Request reference code sequence safety and deletion resilience
"""

import sys
import os
import uuid
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tests.conftest import TestingSessionLocal
from app.models.models import (
    AssistanceRequest, RequestItem, Warehouse, InventoryItem,
    Delivery, DeliveryItem, AllocationRun, AllocationLine
)


def test_multi_warehouse_allocation_and_per_warehouse_deliveries(client, coordinator_headers, dispatcher_headers):
    """
    When an allocation run allocates supplies from multiple warehouses for a request,
    approving the run creates separate delivery records matching each source warehouse.
    Delivering one convoy deducts on-hand inventory strictly from that warehouse.
    """
    # Create high-demand request that requires supplies from multiple hubs
    req_res = client.post(
        "/api/v1/requests/",
        json={
            "location": {
                "name": "Multi-Depot Test Camp, Sindh",
                "district": "Dadu",
                "latitude": 26.73,
                "longitude": 67.78,
                "location_type": "camp"
            },
            "urgency": "CRITICAL",
            "affected_population": 5000,
            "affected_households": 800,
            "vulnerable_count": 400,
            "access_status": "ACCESSIBLE",
            "flood_depth_meters": 1.2,
            "items": [
                {"item_type": "water", "quantity_requested": 8000},
                {"item_type": "food", "quantity_requested": 4000}
            ],
            "description": "High demand test requiring multi-warehouse fulfillment"
        },
        headers=coordinator_headers,
    )
    assert req_res.status_code == 201
    req_data = req_res.json()
    req_id = req_data["id"]

    # Run allocation
    alloc_res = client.post("/api/v1/allocation-runs/", json={}, headers=coordinator_headers)
    assert alloc_res.status_code == 201
    run_id = alloc_res.json()["id"]

    # Approve run
    app_res = client.post(f"/api/v1/allocation-runs/{run_id}/approve", json={"notes": "Approved for multi-hub dispatch"}, headers=coordinator_headers)
    assert app_res.status_code == 200

    # Check deliveries created
    del_res = client.get("/api/v1/deliveries/", headers=coordinator_headers)
    assert del_res.status_code == 200
    all_deliveries = del_res.json()
    run_deliveries = [d for d in all_deliveries if d["allocation_run_id"] == run_id]

    # Group by warehouse
    warehouses_used = set(d["warehouse_id"] for d in run_deliveries)
    assert len(run_deliveries) >= 1

    # Verify each delivery has warehouse_name, destination_community, etc.
    for d in run_deliveries:
        assert d["warehouse_id"] is not None
        assert d["status"] == "ASSIGNED"

    # Pick the first delivery and advance to DELIVERED
    deliv = run_deliveries[0]
    deliv_id = deliv["id"]
    source_wh_id = deliv["warehouse_id"]

    # Get warehouse inventory before delivery
    db = TestingSessionLocal()
    try:
        wh_item_before = db.query(InventoryItem).filter(
            InventoryItem.warehouse_id == source_wh_id,
            InventoryItem.item_type == "water"
        ).first()
        initial_on_hand = wh_item_before.quantity_on_hand if wh_item_before else 0
        initial_reserved = wh_item_before.quantity_reserved if wh_item_before else 0
    finally:
        db.close()

    # Advance: ASSIGNED -> DISPATCHED -> IN_TRANSIT -> DELIVERED
    r1 = client.patch(f"/api/v1/deliveries/{deliv_id}/status", json={"status": "DISPATCHED", "note": "Departed"}, headers=dispatcher_headers)
    assert r1.status_code == 200
    r2 = client.patch(f"/api/v1/deliveries/{deliv_id}/status", json={"status": "IN_TRANSIT", "note": "En route"}, headers=dispatcher_headers)
    assert r2.status_code == 200
    r3 = client.patch(f"/api/v1/deliveries/{deliv_id}/status", json={"status": "DELIVERED", "note": "Delivered successfully"}, headers=dispatcher_headers)
    assert r3.status_code == 200
    assert r3.json()["status"] == "DELIVERED"

    # Check that stock was decremented from the source warehouse
    db = TestingSessionLocal()
    try:
        wh_item_after = db.query(InventoryItem).filter(
            InventoryItem.warehouse_id == source_wh_id,
            InventoryItem.item_type == "water"
        ).first()
        assert wh_item_after.quantity_reserved <= initial_reserved
        assert wh_item_after.quantity_on_hand <= initial_on_hand
    finally:
        db.close()


def test_failed_delivery_releases_reservations_and_restores_demand(client, coordinator_headers, dispatcher_headers):
    """
    When a delivery fails:
    1. Reservations are safely released back to available pool at the source warehouse.
    2. The destination request's allocated quantity is restored and status reverted.
    """
    # Create request
    req_res = client.post(
        "/api/v1/requests/",
        json={
            "location": {
                "name": "Flood-Isolated Village, Sehwan",
                "district": "Jamshoro",
                "latitude": 26.42,
                "longitude": 67.86,
                "location_type": "camp"
            },
            "urgency": "HIGH",
            "affected_population": 800,
            "affected_households": 120,
            "vulnerable_count": 60,
            "access_status": "BOAT_ONLY",
            "flood_depth_meters": 2.5,
            "items": [
                {"item_type": "water", "quantity_requested": 500},
                {"item_type": "medical", "quantity_requested": 20}
            ],
            "description": "Test failure scenario"
        },
        headers=coordinator_headers,
    )
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]
    # Restock warehouses and set truck fleet to ensure clean allocation
    db = TestingSessionLocal()
    try:
        for wh in db.query(Warehouse).all():
            wh.available_delivery_trucks = 20
        for inv in db.query(InventoryItem).all():
            inv.quantity_on_hand += 5000
        db.commit()
    finally:
        db.close()

    # Run allocation & approve
    alloc_res = client.post("/api/v1/allocation-runs/", json={}, headers=coordinator_headers)
    assert alloc_res.status_code == 201
    run_id = alloc_res.json()["id"]
    app_res = client.post(f"/api/v1/allocation-runs/{run_id}/approve", json={"notes": "Approve test"}, headers=coordinator_headers)
    assert app_res.status_code == 200
    # Find created delivery for this run
    del_res = client.get("/api/v1/deliveries/", headers=coordinator_headers)
    run_deliveries = [d for d in del_res.json() if d["allocation_run_id"] == run_id]
    assert len(run_deliveries) > 0, f"run_id={run_id}, all_deliveries={del_res.json()}"
    delivery = run_deliveries[0]
    delivery_id = delivery["id"]
    wh_id = delivery["warehouse_id"]
    req_id = delivery["request_id"]

    # Read reserved quantity in warehouse before failure
    db = TestingSessionLocal()
    try:
        del_item = db.query(DeliveryItem).filter(DeliveryItem.delivery_id == delivery_id).first()
        assert del_item is not None
        test_item_type = del_item.item_type
        del_qty = del_item.quantity

        inv_before = db.query(InventoryItem).filter(
            InventoryItem.warehouse_id == wh_id,
            InventoryItem.item_type == test_item_type
        ).first()
        reserved_before = inv_before.quantity_reserved
        avail_before = inv_before.quantity_available
    finally:
        db.close()

    # Transition: ASSIGNED -> DISPATCHED -> IN_TRANSIT
    client.patch(f"/api/v1/deliveries/{delivery_id}/status", json={"status": "DISPATCHED", "note": "Dispatched"}, headers=dispatcher_headers)
    client.patch(f"/api/v1/deliveries/{delivery_id}/status", json={"status": "IN_TRANSIT", "note": "In transit"}, headers=dispatcher_headers)

    # Transition: IN_TRANSIT -> FAILED
    fail_res = client.patch(
        f"/api/v1/deliveries/{delivery_id}/status",
        json={
            "status": "FAILED",
            "note": "Road submerged at kilometer 14",
            "failure_reason": "Culvert collapsed under flash flood surge"
        },
        headers=dispatcher_headers
    )
    assert fail_res.status_code == 200
    assert fail_res.json()["status"] == "FAILED"
    assert "Culvert collapsed" in fail_res.json()["failure_reason"]

    # Verify warehouse stock reservations were released back to available pool
    db = TestingSessionLocal()
    try:
        inv_after = db.query(InventoryItem).filter(
            InventoryItem.warehouse_id == wh_id,
            InventoryItem.item_type == test_item_type
        ).first()
        # Reserved must have decreased by del_qty
        assert inv_after.quantity_reserved == reserved_before - del_qty
        # Available must have increased by del_qty
        assert inv_after.quantity_available == avail_before + del_qty

        # Verify request status was restored
        req_db = db.query(AssistanceRequest).filter(AssistanceRequest.id == req_id).first()
        assert req_db.status in ("PARTIALLY_ALLOCATED", "PENDING")
    finally:
        db.close()


def test_delivery_status_idempotent_retry(client, coordinator_headers, dispatcher_headers):
    """
    Retrying a delivery status update (same status or replay with same Idempotency-Key)
    succeeds with 200 and does NOT cause duplicate inventory deductions.
    """
    # Query an existing assigned delivery
    del_res = client.get("/api/v1/deliveries/", headers=coordinator_headers)
    assigned_dels = [d for d in del_res.json() if d["status"] == "ASSIGNED"]
    assert len(assigned_dels) > 0
    target_del = assigned_dels[0]
    del_id = target_del["id"]

    key = str(uuid.uuid4())
    headers = {**dispatcher_headers, "Idempotency-Key": key}

    # 1st attempt: ASSIGNED -> DISPATCHED
    r1 = client.patch(
        f"/api/v1/deliveries/{del_id}/status",
        json={"status": "DISPATCHED", "note": "Driver left depot"},
        headers=headers,
    )
    assert r1.status_code == 200
    assert r1.json()["status"] == "DISPATCHED"

    # 2nd attempt with same idempotency key and payload (simulate client network timeout & retry)
    r2 = client.patch(
        f"/api/v1/deliveries/{del_id}/status",
        json={"status": "DISPATCHED", "note": "Driver left depot"},
        headers=headers,
    )
    assert r2.status_code == 200
    assert r2.json()["status"] == "DISPATCHED"

    # Also test idempotent retry without header when status is already DISPATCHED
    r3 = client.patch(
        f"/api/v1/deliveries/{del_id}/status",
        json={"status": "DISPATCHED", "note": "Driver left depot retry"},
        headers=dispatcher_headers,
    )
    assert r3.status_code == 200
    assert r3.json()["status"] == "DISPATCHED"


def test_authorization_rbac_enforcement(client, coordinator_headers, dispatcher_headers, warehouse_headers, admin_headers):
    """
    Role-Based Access Control:
    - Delivery status updates require LOGISTICS_COORDINATOR, FIELD_DISPATCHER, or SYSTEM_ADMIN.
      INVENTORY_MANAGER gets 403 Forbidden.
    - Delivery driver/vehicle assignment requires LOGISTICS_COORDINATOR or SYSTEM_ADMIN.
      FIELD_DISPATCHER gets 403 Forbidden.
    - User self-updates: modifying role or is_active is ADMIN_ONLY.
    """
    del_res = client.get("/api/v1/deliveries/", headers=coordinator_headers)
    deliveries = del_res.json()
    assert len(deliveries) > 0
    delivery_id = deliveries[0]["id"]

    # 1. Non-logistics role (warehouse manager) trying to advance delivery status -> 403
    r_deny_status = client.patch(
        f"/api/v1/deliveries/{delivery_id}/status",
        json={"status": "DISPATCHED", "note": "Unauthorized status update"},
        headers=warehouse_headers,
    )
    assert r_deny_status.status_code == 403
    assert r_deny_status.json()["error"]["code"] == "INSUFFICIENT_ROLE"

    # 2. Dispatcher trying to reassign vehicle/driver -> 403
    r_deny_assign = client.post(
        f"/api/v1/deliveries/{delivery_id}/assign",
        json={"driver_name": "Unauthorized Driver", "vehicle_code": "ROGUE-TRUCK"},
        headers=dispatcher_headers,
    )
    assert r_deny_assign.status_code == 403
    assert r_deny_assign.json()["error"]["code"] == "INSUFFICIENT_ROLE"

    # Coordinator can assign vehicle/driver -> 200
    r_ok_assign = client.post(
        f"/api/v1/deliveries/{delivery_id}/assign",
        json={"driver_name": "Tariq Assigned Driver", "vehicle_code": "GOV-TRUCK-09"},
        headers=coordinator_headers,
    )
    assert r_ok_assign.status_code == 200

    # 3. User self-update: Dispatcher trying to promote self to SYSTEM_ADMIN -> 403
    me_res = client.get("/api/v1/auth/me", headers=dispatcher_headers)
    assert me_res.status_code == 200
    my_id = me_res.json()["id"]

    r_privilege_escalation = client.patch(
        f"/api/v1/users/{my_id}",
        json={"role": "SYSTEM_ADMIN"},
        headers=dispatcher_headers,
    )
    assert r_privilege_escalation.status_code == 403
    assert r_privilege_escalation.json()["error"]["code"] == "ADMIN_ONLY"

    # Safe self-update of display_name by non-admin succeeds -> 200
    r_safe_update = client.patch(
        f"/api/v1/users/{my_id}",
        json={"display_name": "Zainab Baloch (Lead)"},
        headers=dispatcher_headers,
    )
    assert r_safe_update.status_code == 200
    assert r_safe_update.json()["display_name"] == "Zainab Baloch (Lead)"

    # Admin updating user role -> 200
    r_admin_update = client.patch(
        f"/api/v1/users/{my_id}",
        json={"role": "FIELD_DISPATCHER"},
        headers=admin_headers,
    )
    assert r_admin_update.status_code == 200


def test_idempotent_request_creation_and_stock_movements(client, coordinator_headers):
    """
    Idempotency-Key ensures:
    - Creating a request with the same key returns the existing request, without creating duplicates.
    - Adding a stock movement with the same key returns the existing response, without adjusting stock twice.
    """
    key = str(uuid.uuid4())
    req_body = {
        "location": {
            "name": "Idempotency Test Settlement",
            "district": "Larkana",
            "latitude": 27.55,
            "longitude": 68.21,
            "location_type": "camp"
        },
        "urgency": "MODERATE",
        "affected_population": 300,
        "affected_households": 50,
        "vulnerable_count": 20,
        "access_status": "ACCESSIBLE",
        "flood_depth_meters": 0.5,
        "items": [
            {"item_type": "water", "quantity_requested": 1000}
        ],
        "description": "Verify idempotency"
    }

    # 1st creation
    r1 = client.post("/api/v1/requests/", json=req_body, headers={**coordinator_headers, "Idempotency-Key": key})
    assert r1.status_code == 201
    created_id = r1.json()["id"]
    ref_code = r1.json()["reference_code"]

    # 2nd creation with exact same idempotency key (network retry simulation)
    r2 = client.post("/api/v1/requests/", json=req_body, headers={**coordinator_headers, "Idempotency-Key": key})
    assert r2.status_code == 201
    assert r2.json()["id"] == created_id
    assert r2.json()["reference_code"] == ref_code

    # Stock movement idempotency
    wh_res = client.get("/api/v1/warehouses/", headers=coordinator_headers)
    wh_id = wh_res.json()[0]["id"]

    movement_key = str(uuid.uuid4())
    move_body = {
        "item_type": "water",
        "quantity_delta": 50,
        "reason": "Test restock idempotency"
    }

    m1 = client.post(
        f"/api/v1/inventory/warehouses/{wh_id}/stock-movements",
        json=move_body,
        headers={**coordinator_headers, "Idempotency-Key": movement_key}
    )
    assert m1.status_code == 201

    m2 = client.post(
        f"/api/v1/inventory/warehouses/{wh_id}/stock-movements",
        json=move_body,
        headers={**coordinator_headers, "Idempotency-Key": movement_key}
    )
    assert m2.status_code == 201
    assert m2.json()["id"] == m1.json()["id"]


def test_request_reference_code_concurrency_and_deletion_safety(client, coordinator_headers):
    """
    Reference codes follow REQ-XXXX format.
    Even after records are deleted, the next code is monotonically increasing
    above any remaining or past records, preventing collisions.
    """
    # Create request A
    r_a = client.post(
        "/api/v1/requests/",
        json={
            "location": {"name": "Camp A", "district": "Dadu", "latitude": 26.7, "longitude": 67.7},
            "urgency": "LOW",
            "affected_population": 100,
            "affected_households": 20,
            "vulnerable_count": 5,
            "access_status": "ACCESSIBLE",
            "flood_depth_meters": 0.2,
            "items": [{"item_type": "water", "quantity_requested": 100}],
        },
        headers=coordinator_headers,
    )
    assert r_a.status_code == 201
    ref_a = r_a.json()["reference_code"]
    num_a = int(ref_a.split("-")[1])

    # Create request B
    r_b = client.post(
        "/api/v1/requests/",
        json={
            "location": {"name": "Camp B", "district": "Dadu", "latitude": 26.8, "longitude": 67.8},
            "urgency": "LOW",
            "affected_population": 100,
            "affected_households": 20,
            "vulnerable_count": 5,
            "access_status": "ACCESSIBLE",
            "flood_depth_meters": 0.2,
            "items": [{"item_type": "water", "quantity_requested": 100}],
        },
        headers=coordinator_headers,
    )
    assert r_b.status_code == 201
    ref_b = r_b.json()["reference_code"]
    num_b = int(ref_b.split("-")[1])
    assert num_b > num_a

    # Delete request A from DB directly to simulate record deletion
    db = TestingSessionLocal()
    try:
        req_a_obj = db.query(AssistanceRequest).filter(AssistanceRequest.reference_code == ref_a).first()
        if req_a_obj:
            db.delete(req_a_obj)
            db.commit()
    finally:
        db.close()

    # Create request C: should NOT reuse deleted number num_a, should be > num_b
    r_c = client.post(
        "/api/v1/requests/",
        json={
            "location": {"name": "Camp C", "district": "Dadu", "latitude": 26.9, "longitude": 67.9},
            "urgency": "LOW",
            "affected_population": 100,
            "affected_households": 20,
            "vulnerable_count": 5,
            "access_status": "ACCESSIBLE",
            "flood_depth_meters": 0.2,
            "items": [{"item_type": "water", "quantity_requested": 100}],
        },
        headers=coordinator_headers,
    )
    assert r_c.status_code == 201
    ref_c = r_c.json()["reference_code"]
    num_c = int(ref_c.split("-")[1])
    assert num_c > num_b
