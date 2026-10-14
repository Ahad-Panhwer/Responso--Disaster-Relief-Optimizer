"""Warehouse routes — create, list, view inventory."""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.models import User, Location, Warehouse, InventoryItem, AuditEvent
from app.schemas.schemas import WarehouseCreate, WarehouseOut, InventoryItemOut, LocationOut
from app.api.deps import get_current_user, require_roles

router = APIRouter()


def _wh_to_out(wh: Warehouse) -> WarehouseOut:
    loc = wh.location
    return WarehouseOut(
        id=wh.id,
        name=wh.name,
        code=wh.code,
        capacity_kg=wh.capacity_kg,
        available_delivery_trucks=wh.available_delivery_trucks,
        contact_person=wh.contact_person,
        contact_phone=wh.contact_phone,
        is_active=wh.is_active,
        location=LocationOut(
            id=loc.id,
            name=loc.name,
            location_type=loc.location_type,
            latitude=loc.latitude,
            longitude=loc.longitude,
            district=loc.district,
            tehsil=loc.tehsil,
            union_council=loc.union_council,
            zone=loc.zone,
            notes=loc.notes,
            is_simulated=loc.is_simulated,
            created_at=loc.created_at,
        ),
        inventory=[
            InventoryItemOut(
                id=inv.id,
                item_type=inv.item_type,
                quantity_on_hand=inv.quantity_on_hand,
                quantity_reserved=inv.quantity_reserved,
                quantity_available=inv.quantity_available,
            )
            for inv in wh.inventory_items
        ],
        created_at=wh.created_at,
    )


@router.get("/", response_model=List[WarehouseOut])
def list_warehouses(db: Session = Depends(get_db), _ = Depends(get_current_user)):
    warehouses = db.query(Warehouse).options(
        joinedload(Warehouse.location),
        joinedload(Warehouse.inventory_items),
    ).all()
    return [_wh_to_out(wh) for wh in warehouses]


@router.get("/{warehouse_id}", response_model=WarehouseOut)
def get_warehouse(warehouse_id: str, db: Session = Depends(get_db), _ = Depends(get_current_user)):
    wh = db.query(Warehouse).options(
        joinedload(Warehouse.location),
        joinedload(Warehouse.inventory_items),
    ).filter(Warehouse.id == warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Warehouse not found.", "details": {}}})
    return _wh_to_out(wh)


@router.post("/", response_model=WarehouseOut, status_code=201)
def create_warehouse(
    body: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("INVENTORY_MANAGER", "LOGISTICS_COORDINATOR", "SYSTEM_ADMIN")),
):
    existing = db.query(Warehouse).filter(Warehouse.code == body.code).first()
    if existing:
        raise HTTPException(status_code=409, detail={"error": {"code": "DUPLICATE_CODE", "message": f"Warehouse code '{body.code}' already exists.", "details": {}}})

    loc = Location(
        id=str(uuid.uuid4()),
        name=body.location.name,
        location_type="warehouse",
        latitude=body.location.latitude,
        longitude=body.location.longitude,
        district=body.location.district,
        notes=body.location.notes,
        is_simulated=body.location.is_simulated,
    )
    db.add(loc)
    db.flush()

    wh = Warehouse(
        id=str(uuid.uuid4()),
        location_id=loc.id,
        name=body.name,
        code=body.code,
        capacity_kg=body.capacity_kg,
        available_delivery_trucks=body.available_delivery_trucks,
        contact_person=body.contact_person,
        contact_phone=body.contact_phone,
    )
    db.add(wh)
    db.flush()

    # Initialize inventory slots for all item types
    for item_type in ["water", "food", "medical", "shelter", "hygiene"]:
        db.add(InventoryItem(
            id=str(uuid.uuid4()),
            warehouse_id=wh.id,
            item_type=item_type,
            quantity_on_hand=0,
            quantity_reserved=0,
        ))

    audit = AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.display_name,
        actor_role=current_user.role,
        action="CREATE_WAREHOUSE",
        category="INVENTORY",
        entity_type="warehouse",
        entity_id=wh.id,
        details=f"Created warehouse {body.name} ({body.code})",
    )
    db.add(audit)
    db.commit()
    db.refresh(wh)
    return _wh_to_out(wh)
