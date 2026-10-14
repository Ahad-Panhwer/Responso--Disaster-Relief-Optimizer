"""
Responso Database Seed Script — Fictional Sindh Flood Relief Scenario (CL-03)
=============================================================================
Populates database with reproducible demo scenario:
- 4 Role-based user accounts with bcrypt hashed passwords ('Password123!')
- 3 Warehouses with inventory (Sukkur Hub, Hyderabad Transit Depot, Karachi Strategic Reserve)
- 5 Assistance requests across affected Sindh districts (Dadu, Johi, Sehwan, Larkana, Khairpur)
- Initial deliveries, stock movements, and audit log events
"""

import sys
import os
from datetime import datetime, timezone, timedelta
import uuid

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.models import (
    User, Location, Warehouse, InventoryItem, StockMovement,
    AssistanceRequest, RequestItem, Delivery, DeliveryItem,
    DeliveryTimeline, AuditEvent
)

DEFAULT_PASSWORD = "Password123!"

SEED_USERS = [
    {
        "id": "USR-PK-01",
        "email": "tariq.mansoor@responso.pk",
        "display_name": "Relief Operations Director",
        "role": "LOGISTICS_COORDINATOR",
        "role_title": "Provincial Relief Commissioner (PDMA Sindh)",
        "department": "Disaster Emergency Coordination Directorate",
    },
    {
        "id": "USR-PK-02",
        "email": "zainab.baloch@responso.pk",
        "display_name": "Zainab Baloch",
        "role": "FIELD_DISPATCHER",
        "role_title": "Senior Field Rapid Response Lead (Dadu & Sukkur)",
        "department": "District Rapid Assessment Division",
    },
    {
        "id": "USR-PK-03",
        "email": "imran.qureshi@responso.pk",
        "display_name": "Imran Qureshi",
        "role": "INVENTORY_MANAGER",
        "role_title": "Regional Warehouse & Supply Lead (Sukkur Hub)",
        "department": "Provincial Staging & Logistics Command",
    },
    {
        "id": "USR-PK-04",
        "email": "farhan.ali@responso.pk",
        "display_name": "Farhan Ali, PAS",
        "role": "SYSTEM_ADMIN",
        "role_title": "Humanitarian Audit & Compliance Inspector",
        "department": "Relief Transparency & Oversight Commission",
    },
    {
        "id": "USR-PK-05",
        "email": "operations@responso.pk",
        "display_name": "Relief Operations Director",
        "role": "LOGISTICS_COORDINATOR",
        "role_title": "Provincial Relief Commissioner (PDMA Sindh)",
        "department": "Disaster Emergency Coordination Directorate",
    },
]

SEED_WAREHOUSES = [
    {
        "id": "WH-SUKKUR",
        "code": "HUB-SUKKUR",
        "name": "Sukkur Barrage Regional Humanitarian Hub",
        "capacity_kg": 50000.0,
        "available_delivery_trucks": 8,
        "contact_person": "Imran Qureshi (Warehouse Manager)",
        "contact_phone": "+92 (300) 882-9901",
        "location": {
            "name": "Airport Bypass Logistics Enclave, Upper Sindh",
            "district": "Sukkur",
            "latitude": 27.7052,
            "longitude": 68.8574,
            "location_type": "warehouse",
        },
        "inventory": {
            "water": {"on_hand": 26500, "reserved": 4500},
            "food": {"on_hand": 15300, "reserved": 2800},
            "medical": {"on_hand": 690, "reserved": 110},
            "shelter": {"on_hand": 515, "reserved": 95},
            "hygiene": {"on_hand": 3400, "reserved": 600},
        },
    },
    {
        "id": "WH-HYDERABAD",
        "code": "DEPOT-HYD",
        "name": "Hyderabad Central Transit & Distribution Depot",
        "capacity_kg": 35000.0,
        "available_delivery_trucks": 6,
        "contact_person": "Sohail Abbasi (Transit Officer)",
        "contact_phone": "+92 (301) 773-4412",
        "location": {
            "name": "Latifabad Industrial Corridor, Central Sindh",
            "district": "Hyderabad",
            "latitude": 25.3960,
            "longitude": 68.3578,
            "location_type": "warehouse",
        },
        "inventory": {
            "water": {"on_hand": 22300, "reserved": 3800},
            "food": {"on_hand": 11900, "reserved": 2100},
            "medical": {"on_hand": 465, "reserved": 75},
            "shelter": {"on_hand": 370, "reserved": 60},
            "hygiene": {"on_hand": 2320, "reserved": 420},
        },
    },
    {
        "id": "WH-KARACHI",
        "code": "BASE-KHI",
        "name": "Karachi Provincial Strategic Reserve Depot",
        "capacity_kg": 85000.0,
        "available_delivery_trucks": 10,
        "contact_person": "Lt. Col. (R) Javed Akhtar",
        "contact_phone": "+92 (302) 991-8844",
        "location": {
            "name": "Malir Cantonment / Port Qasim Transit Base",
            "district": "Karachi",
            "latitude": 24.8934,
            "longitude": 67.1852,
            "location_type": "warehouse",
        },
        "inventory": {
            "water": {"on_hand": 40000, "reserved": 5000},
            "food": {"on_hand": 25500, "reserved": 3500},
            "medical": {"on_hand": 1000, "reserved": 150},
            "shelter": {"on_hand": 770, "reserved": 120},
            "hygiene": {"on_hand": 5250, "reserved": 750},
        },
    },
]

SEED_REQUESTS = [
    {
        "reference_code": "REQ-PK-201",
        "urgency": "CRITICAL",
        "affected_population": 1860,
        "affected_households": 310,
        "vulnerable_count": 540,
        "access_status": "CUT_OFF_ROAD",
        "flood_depth_meters": 1.95,
        "contact_person": "Mukhtiarkar Asif Memon",
        "contact_phone": "+92 (300) 554-1298",
        "status": "PARTIALLY_ALLOCATED",
        "description": "Urgent clean water and ration packs required; road inundated by Dadu canal overflow.",
        "location": {
            "name": "Dadu Govt Degree College Relief Camp",
            "district": "Dadu",
            "tehsil": "Dadu",
            "union_council": "UC Yar Muhammad Kalhoro",
            "zone": "District Dadu · Western Sindh Inundation Corridor",
            "latitude": 26.7329,
            "longitude": 67.7769,
            "location_type": "camp",
        },
        "items": [
            {"item_type": "water", "quantity_requested": 5500, "quantity_allocated": 4400},
            {"item_type": "food", "quantity_requested": 3100, "quantity_allocated": 2500},
            {"item_type": "medical", "quantity_requested": 130, "quantity_allocated": 130},
            {"item_type": "shelter", "quantity_requested": 95, "quantity_allocated": 75},
            {"item_type": "hygiene", "quantity_requested": 650, "quantity_allocated": 520},
        ],
    },
    {
        "reference_code": "REQ-PK-202",
        "urgency": "CRITICAL",
        "affected_population": 2450,
        "affected_households": 410,
        "vulnerable_count": 720,
        "access_status": "BOAT_ONLY",
        "flood_depth_meters": 2.30,
        "contact_person": "Dr. Shireen Laghari",
        "contact_phone": "+92 (301) 443-8871",
        "status": "PENDING",
        "description": "Entire tehsil cut off. Only accessible via rescue speedboats; high fever and waterborne risk.",
        "location": {
            "name": "Johi Rural Health Center Flood Shelter",
            "district": "Dadu",
            "tehsil": "Johi",
            "union_council": "UC Johi North",
            "zone": "Manchar Lake Catchment Zone",
            "latitude": 26.6917,
            "longitude": 67.6144,
            "location_type": "camp",
        },
        "items": [
            {"item_type": "water", "quantity_requested": 8000, "quantity_allocated": 0},
            {"item_type": "food", "quantity_requested": 4500, "quantity_allocated": 0},
            {"item_type": "medical", "quantity_requested": 210, "quantity_allocated": 0},
            {"item_type": "shelter", "quantity_requested": 160, "quantity_allocated": 0},
            {"item_type": "hygiene", "quantity_requested": 900, "quantity_allocated": 0},
        ],
    },
    {
        "reference_code": "REQ-PK-203",
        "urgency": "HIGH",
        "affected_population": 3200,
        "affected_households": 530,
        "vulnerable_count": 890,
        "access_status": "ACCESSIBLE",
        "flood_depth_meters": 1.10,
        "contact_person": "Khadim Hussain Solangi",
        "contact_phone": "+92 (302) 667-2234",
        "status": "PENDING",
        "description": "Massive temporary tent city formed on highway embankments. High family count.",
        "location": {
            "name": "Sehwan Sharif Lal Shahbaz Complex Staging Ground",
            "district": "Jamshoro",
            "tehsil": "Sehwan",
            "union_council": "UC Sehwan Urban",
            "zone": "Indus Highway Indus Relief Corridor",
            "latitude": 26.4251,
            "longitude": 67.8622,
            "location_type": "camp",
        },
        "items": [
            {"item_type": "water", "quantity_requested": 9500, "quantity_allocated": 0},
            {"item_type": "food", "quantity_requested": 5200, "quantity_allocated": 0},
            {"item_type": "medical", "quantity_requested": 180, "quantity_allocated": 0},
            {"item_type": "shelter", "quantity_requested": 120, "quantity_allocated": 0},
            {"item_type": "hygiene", "quantity_requested": 1100, "quantity_allocated": 0},
        ],
    },
    {
        "reference_code": "REQ-PK-204",
        "urgency": "MODERATE",
        "affected_population": 1420,
        "affected_households": 240,
        "vulnerable_count": 380,
        "access_status": "ACCESSIBLE",
        "flood_depth_meters": 0.65,
        "contact_person": "Engr. Noman Abro",
        "contact_phone": "+92 (303) 778-9900",
        "status": "PENDING",
        "description": "Sheltered inside sports pavilion; primary need is hygiene kits and potable water tanks.",
        "location": {
            "name": "Larkana Municipal Sports Stadium Camp",
            "district": "Larkana",
            "tehsil": "Larkana",
            "union_council": "UC Waggan Road",
            "zone": "Central Larkana Municipal Zone",
            "latitude": 27.5590,
            "longitude": 68.2120,
            "location_type": "camp",
        },
        "items": [
            {"item_type": "water", "quantity_requested": 4200, "quantity_allocated": 0},
            {"item_type": "food", "quantity_requested": 2400, "quantity_allocated": 0},
            {"item_type": "medical", "quantity_requested": 95, "quantity_allocated": 0},
            {"item_type": "shelter", "quantity_requested": 60, "quantity_allocated": 0},
            {"item_type": "hygiene", "quantity_requested": 480, "quantity_allocated": 0},
        ],
    },
    {
        "reference_code": "REQ-PK-205",
        "urgency": "LOW",
        "affected_population": 980,
        "affected_households": 165,
        "vulnerable_count": 260,
        "access_status": "ACCESSIBLE",
        "flood_depth_meters": 0.30,
        "contact_person": "Prof. Altaf Wassan",
        "contact_phone": "+92 (300) 887-3341",
        "status": "PENDING",
        "description": "Secondary school classrooms utilized as relief transit point; flood receded partially.",
        "location": {
            "name": "Khairpur Mirs Govt Comprehensive School Shelter",
            "district": "Khairpur",
            "tehsil": "Khairpur",
            "union_council": "UC Luqman",
            "zone": "East Bank Agricultural Strip",
            "latitude": 27.5295,
            "longitude": 68.7592,
            "location_type": "camp",
        },
        "items": [
            {"item_type": "water", "quantity_requested": 2800, "quantity_allocated": 0},
            {"item_type": "food", "quantity_requested": 1600, "quantity_allocated": 0},
            {"item_type": "medical", "quantity_requested": 60, "quantity_allocated": 0},
            {"item_type": "shelter", "quantity_requested": 40, "quantity_allocated": 0},
            {"item_type": "hygiene", "quantity_requested": 320, "quantity_allocated": 0},
        ],
    },
]


def seed_database(db: Session, reset: bool = True) -> dict:
    """Clear and seed the database with consistent demo disaster scenario."""
    target_engine = db.get_bind()
    if reset:
        # Recreate tables cleanly
        Base.metadata.drop_all(bind=target_engine)
        Base.metadata.create_all(bind=target_engine)

    password_hash = hash_password(DEFAULT_PASSWORD)

    # 1. Seed Users
    user_map = {}
    for u_data in SEED_USERS:
        user = User(
            id=u_data["id"],
            email=u_data["email"],
            password_hash=password_hash,
            display_name=u_data["display_name"],
            role=u_data["role"],
            role_title=u_data.get("role_title", ""),
            department=u_data.get("department", ""),
            is_active=True,
        )
        db.add(user)
        user_map[u_data["id"]] = user
    db.flush()

    # 2. Seed Warehouses & Inventory
    wh_map = {}
    for wh_data in SEED_WAREHOUSES:
        loc_data = wh_data["location"]
        loc = Location(
            id=str(uuid.uuid4()),
            name=loc_data["name"],
            district=loc_data["district"],
            latitude=loc_data["latitude"],
            longitude=loc_data["longitude"],
            location_type=loc_data["location_type"],
            notes=f"Regional warehouse node for {loc_data['district']}",
            is_simulated=True,
        )
        db.add(loc)
        db.flush()

        wh = Warehouse(
            id=wh_data["id"],
            code=wh_data["code"],
            name=wh_data["name"],
            location_id=loc.id,
            capacity_kg=wh_data["capacity_kg"],
            available_delivery_trucks=wh_data["available_delivery_trucks"],
            contact_person=wh_data["contact_person"],
            contact_phone=wh_data["contact_phone"],
            is_active=True,
        )
        db.add(wh)
        db.flush()
        wh_map[wh_data["id"]] = wh

        for item_type, stock_info in wh_data["inventory"].items():
            inv = InventoryItem(
                id=str(uuid.uuid4()),
                warehouse_id=wh.id,
                item_type=item_type,
                quantity_on_hand=stock_info["on_hand"],
                quantity_reserved=stock_info["reserved"],
            )
            db.add(inv)

            # Add an initial stock movement
            mov = StockMovement(
                id=str(uuid.uuid4()),
                warehouse_id=wh.id,
                item_type=item_type,
                quantity_delta=stock_info["on_hand"],
                balance_after=stock_info["on_hand"],
                reason=f"Initial staging intake for 2026 Sindh monsoon response",
                actor_id=user_map["USR-PK-03"].id,
                actor_name=user_map["USR-PK-03"].display_name,
            )
            db.add(mov)

    # 3. Seed Requests
    req_map = {}
    for r_data in SEED_REQUESTS:
        loc_data = r_data["location"]
        loc = Location(
            id=str(uuid.uuid4()),
            name=loc_data["name"],
            district=loc_data["district"],
            tehsil=loc_data.get("tehsil", ""),
            union_council=loc_data.get("union_council", ""),
            zone=loc_data.get("zone", ""),
            latitude=loc_data["latitude"],
            longitude=loc_data["longitude"],
            location_type=loc_data.get("location_type", "camp"),
            notes="Simulated high-priority community site",
            is_simulated=True,
        )
        db.add(loc)
        db.flush()

        req = AssistanceRequest(
            id=str(uuid.uuid4()),
            reference_code=r_data["reference_code"],
            location_id=loc.id,
            urgency=r_data["urgency"],
            affected_population=r_data["affected_population"],
            affected_households=r_data["affected_households"],
            vulnerable_count=r_data["vulnerable_count"],
            access_status=r_data["access_status"],
            flood_depth_meters=r_data["flood_depth_meters"],
            contact_person=r_data["contact_person"],
            contact_phone=r_data["contact_phone"],
            status=r_data["status"],
            description=r_data["description"],
            created_by_id=user_map["USR-PK-02"].id,
        )
        db.add(req)
        db.flush()
        req_map[r_data["reference_code"]] = req

        for it in r_data["items"]:
            item = RequestItem(
                id=str(uuid.uuid4()),
                request_id=req.id,
                item_type=it["item_type"],
                quantity_requested=it["quantity_requested"],
                quantity_allocated=it.get("quantity_allocated", 0),
            )
            db.add(item)

    # 4. Seed Initial Deliveries for REQ-PK-201
    now = datetime.now(timezone.utc)
    dadu_req = req_map["REQ-PK-201"]
    sukkur_wh = wh_map["WH-SUKKUR"]

    del1 = Delivery(
        id="DEL-PK-101",
        request_id=dadu_req.id,
        warehouse_id=sukkur_wh.id,
        status="IN_TRANSIT",
        vehicle_code="TRK-SK-04",
        driver_name="Imran Qureshi",
        driver_phone="+92 300 882-9901",
        capacity_units=15000.0,
        distance_km=142.0,
        eta_minutes=180,
        dispatch_note="Priority water and food convoy escorted by local rescue boat detachment.",
        assigned_to_id=user_map["USR-PK-02"].id,
        created_at=now - timedelta(hours=3),
        dispatched_at=now - timedelta(hours=2),
    )
    db.add(del1)
    db.flush()

    db.add(DeliveryItem(id=str(uuid.uuid4()), delivery_id=del1.id, item_type="water", quantity=2000))
    db.add(DeliveryItem(id=str(uuid.uuid4()), delivery_id=del1.id, item_type="food", quantity=1000))
    db.add(DeliveryItem(id=str(uuid.uuid4()), delivery_id=del1.id, item_type="medical", quantity=50))

    db.add(DeliveryTimeline(
        id=str(uuid.uuid4()),
        delivery_id=del1.id,
        event_text="Consignment packed and staged at Sukkur Logistics Hub bay 2.",
        status="ASSIGNED",
        created_at=now - timedelta(hours=3),
    ))
    db.add(DeliveryTimeline(
        id=str(uuid.uuid4()),
        delivery_id=del1.id,
        event_text="Convoy departed Sukkur bypass en route to Dadu inundated zone.",
        status="DISPATCHED",
        created_at=now - timedelta(hours=2),
    ))
    db.add(DeliveryTimeline(
        id=str(uuid.uuid4()),
        delivery_id=del1.id,
        event_text="Crossing Indus highway temporary bypass; slow movement due to high water levels.",
        status="IN_TRANSIT",
        created_at=now - timedelta(minutes=45),
    ))

    # 5. Seed Initial Audit Logs
    audit_events = [
        AuditEvent(
            id=str(uuid.uuid4()),
            actor_id=user_map["USR-PK-04"].id,
            actor_name=user_map["USR-PK-04"].display_name,
            actor_role=user_map["USR-PK-04"].role,
            action="SYSTEM_INIT",
            category="SYSTEM",
            entity_type="system",
            entity_id="init",
            details="Responso Disaster Relief Resource Optimizer v1.0 initialized for Sindh relief response.",
            created_at=now - timedelta(days=1),
        ),
        AuditEvent(
            id=str(uuid.uuid4()),
            actor_id=user_map["USR-PK-03"].id,
            actor_name=user_map["USR-PK-03"].display_name,
            actor_role=user_map["USR-PK-03"].role,
            action="STOCK_INTAKE",
            category="INVENTORY",
            entity_type="warehouse",
            entity_id=sukkur_wh.id,
            details="Verified intake of 26,500 water jerry cans and 15,300 food ration packs at Sukkur hub.",
            created_at=now - timedelta(hours=12),
        ),
        AuditEvent(
            id=str(uuid.uuid4()),
            actor_id=user_map["USR-PK-02"].id,
            actor_name=user_map["USR-PK-02"].display_name,
            actor_role=user_map["USR-PK-02"].role,
            action="CREATE_REQUEST",
            category="REQUEST",
            entity_type="request",
            entity_id=dadu_req.id,
            details="Registered critical flood relief request for Dadu Degree College camp (1,860 pop).",
            created_at=now - timedelta(hours=6),
        ),
        AuditEvent(
            id=str(uuid.uuid4()),
            actor_id=user_map["USR-PK-01"].id,
            actor_name=user_map["USR-PK-01"].display_name,
            actor_role=user_map["USR-PK-01"].role,
            action="DISPATCH_CONVOY",
            category="DISPATCH",
            entity_type="delivery",
            entity_id=del1.id,
            details="Authorized convoy TRK-SK-04 departure from Sukkur hub to Dadu Degree College.",
            created_at=now - timedelta(hours=2),
        ),
    ]
    for a in audit_events:
        db.add(a)

    db.commit()

    return {
        "status": "success",
        "users": len(SEED_USERS),
        "warehouses": len(SEED_WAREHOUSES),
        "requests": len(SEED_REQUESTS),
        "deliveries": 1,
        "audit_logs": len(audit_events),
    }


if __name__ == "__main__":
    db = SessionLocal()
    try:
        print("[+] Seeding Responso database with Sindh disaster scenario...")
        res = seed_database(db, reset=True)
        print(f"[OK] Seeding complete: {res}")
    finally:
        db.close()
