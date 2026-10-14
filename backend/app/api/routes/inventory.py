"""Inventory management — stock movements with transaction safety."""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import User, Warehouse, InventoryItem, StockMovement, AuditEvent, AllocationRun
from app.schemas.schemas import StockMovementCreate, StockMovementOut
from app.api.deps import get_current_user, require_roles
from app.core.idempotency import (
    get_idempotency_key,
    find_idempotency_record,
    save_idempotency_record,
    respond_with_cached_record,
)

router = APIRouter()


@router.get("/warehouses/{warehouse_id}/stock-movements", response_model=List[StockMovementOut])
def list_movements(
    warehouse_id: str,
    db: Session = Depends(get_db),
    _ = Depends(get_current_user),
):
    """List stock movements for a warehouse."""
    wh = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Warehouse not found.", "details": {}}})
    movements = (
        db.query(StockMovement)
        .filter(StockMovement.warehouse_id == warehouse_id)
        .order_by(StockMovement.created_at.desc())
        .all()
    )
    return movements


@router.get("/stock-movements", response_model=List[StockMovementOut])
def list_all_movements(
    db: Session = Depends(get_db),
    _ = Depends(get_current_user),
):
    """List all stock movements across all warehouses."""
    return db.query(StockMovement).order_by(StockMovement.created_at.desc()).all()


@router.post("/warehouses/{warehouse_id}/stock-movements", response_model=StockMovementOut, status_code=201)
def add_stock_movement(
    warehouse_id: str,
    request: Request,
    body: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("INVENTORY_MANAGER", "LOGISTICS_COORDINATOR", "SYSTEM_ADMIN")),
):
    """
    Record a stock movement (inbound or outbound).
    Blocks adjustments that would make available stock negative.
    A stock movement cannot reduce available stock below reservations.
    """
    idem_key = get_idempotency_key(request)
    if idem_key:
        cached = find_idempotency_record(db, idem_key)
        if cached:
            return respond_with_cached_record(cached)

    wh = db.query(Warehouse).filter(Warehouse.id == warehouse_id, Warehouse.is_active == True).first()
    if not wh:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Warehouse not found or inactive.", "details": {}}})

    # Lock inventory item for update
    inv = (
        db.query(InventoryItem)
        .filter(InventoryItem.warehouse_id == warehouse_id, InventoryItem.item_type == body.item_type)
        .with_for_update()
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": f"No inventory slot for {body.item_type} at this warehouse.", "details": {}}})

    new_on_hand = inv.quantity_on_hand + body.quantity_delta
    new_available = new_on_hand - inv.quantity_reserved

    # Guard: available stock cannot go negative
    if new_available < 0:
        raise HTTPException(
            status_code=409,
            detail={
                "error": {
                    "code": "INSUFFICIENT_STOCK",
                    "message": (
                        f"Adjustment of {body.quantity_delta:+d} would leave available "
                        f"{body.item_type} at {new_available} (negative). "
                        f"Current: on_hand={inv.quantity_on_hand}, reserved={inv.quantity_reserved}. "
                        f"Reduce the quantity or adjust reservations first."
                    ),
                    "details": {
                        "on_hand": inv.quantity_on_hand,
                        "reserved": inv.quantity_reserved,
                        "delta": body.quantity_delta,
                    },
                }
            },
        )

    # Guard: on_hand cannot go negative
    if new_on_hand < 0:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "INSUFFICIENT_STOCK", "message": f"on_hand cannot go below zero.", "details": {}}},
        )

    inv.quantity_on_hand = new_on_hand

    movement = StockMovement(
        id=str(uuid.uuid4()),
        warehouse_id=warehouse_id,
        item_type=body.item_type,
        quantity_delta=body.quantity_delta,
        balance_after=new_on_hand,
        reason=body.reason,
        actor_id=current_user.id,
        actor_name=current_user.display_name,
    )
    db.add(movement)

    # Mark draft runs as stale
    db.query(AllocationRun).filter(AllocationRun.status == "DRAFT").update(
        {"is_stale": True, "stale_reason": f"Stock adjusted at {wh.code}"},
        synchronize_session=False,
    )

    audit = AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.display_name,
        actor_role=current_user.role,
        action="STOCK_MOVEMENT",
        category="INVENTORY",
        entity_type="warehouse",
        entity_id=warehouse_id,
        details=f"Stock adjustment at {wh.code}: {body.quantity_delta:+d} {body.item_type} (balance_after={new_on_hand}). Reason: {body.reason}",
    )
    db.add(audit)
    db.commit()
    db.refresh(movement)
    out = StockMovementOut.model_validate(movement)
    if idem_key:
        save_idempotency_record(db, idem_key, current_user.id, f"/api/v1/inventory/warehouses/{warehouse_id}/stock-movements", 201, out)
    return out

