"""Delivery tracking routes — status transitions with validation."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.models import (
    User, Delivery, DeliveryItem, DeliveryTimeline,
    AssistanceRequest, Warehouse, InventoryItem, RequestItem, StockMovement, AuditEvent
)
from app.schemas.schemas import DeliveryAssign, DeliveryStatusUpdate, DeliveryOut, DeliveryItemOut, DeliveryTimelineOut
from app.api.deps import get_current_user, require_roles
from app.core.idempotency import (
    get_idempotency_key,
    find_idempotency_record,
    save_idempotency_record,
    respond_with_cached_record,
)

router = APIRouter()

# Valid status transition machine (matches frontend)
VALID_TRANSITIONS = {
    "ASSIGNED": ["DISPATCHED"],
    "DISPATCHED": ["IN_TRANSIT"],
    "IN_TRANSIT": ["DELIVERED", "FAILED"],
    "DELIVERED": [],  # terminal
    "FAILED": [],     # terminal
}


def _delivery_to_out(d: Delivery) -> DeliveryOut:
    wh_name = d.warehouse.name if d.warehouse else None
    wh_code = d.warehouse.code if d.warehouse else None
    dest_comm = d.request.location.name if d.request and d.request.location else None
    dest_dist = d.request.location.district if d.request and d.request.location else None
    ref_code = d.request.reference_code if d.request else None

    return DeliveryOut(
        id=d.id,
        allocation_run_id=d.allocation_run_id,
        request_id=d.request_id,
        warehouse_id=d.warehouse_id,
        warehouse_name=wh_name,
        warehouse_code=wh_code,
        destination_community=dest_comm,
        destination_district=dest_dist,
        request_reference_code=ref_code,
        status=d.status,
        vehicle_code=d.vehicle_code or "",
        driver_name=d.driver_name or "",
        driver_phone=d.driver_phone or "",
        distance_km=d.distance_km or 0.0,
        eta_minutes=d.eta_minutes or 0,
        dispatch_note=d.dispatch_note or "",
        failure_reason=d.failure_reason or "",
        created_at=d.created_at,
        updated_at=d.updated_at,
        dispatched_at=d.dispatched_at,
        delivered_at=d.delivered_at,
        items=[DeliveryItemOut(id=i.id, item_type=i.item_type, quantity=i.quantity) for i in d.items],
        timeline_events=[
            DeliveryTimelineOut(
                id=t.id,
                event_text=t.event_text,
                status=t.status,
                note=t.note or "",
                created_at=t.created_at,
            )
            for t in sorted(d.timeline_events, key=lambda x: x.created_at)
        ],
    )


@router.get("/", response_model=List[DeliveryOut])
def list_deliveries(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _ = Depends(get_current_user),
):
    q = db.query(Delivery).options(
        joinedload(Delivery.items),
        joinedload(Delivery.timeline_events),
        joinedload(Delivery.warehouse),
        joinedload(Delivery.request).joinedload(AssistanceRequest.location),
    )
    if status_filter:
        q = q.filter(Delivery.status == status_filter.upper())
    deliveries = q.order_by(Delivery.created_at.desc()).all()
    return [_delivery_to_out(d) for d in deliveries]


@router.get("/{delivery_id}", response_model=DeliveryOut)
def get_delivery(delivery_id: str, db: Session = Depends(get_db), _ = Depends(get_current_user)):
    d = db.query(Delivery).options(
        joinedload(Delivery.items),
        joinedload(Delivery.timeline_events),
        joinedload(Delivery.warehouse),
        joinedload(Delivery.request).joinedload(AssistanceRequest.location),
    ).filter(Delivery.id == delivery_id).first()
    if not d:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Delivery not found.", "details": {}}})
    return _delivery_to_out(d)


@router.post("/{delivery_id}/assign")
def assign_delivery(
    delivery_id: str,
    body: DeliveryAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("LOGISTICS_COORDINATOR", "SYSTEM_ADMIN")),
):
    """Update driver and vehicle assignment details. Restricted to logistics/admin roles."""
    d = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not d:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Delivery not found.", "details": {}}})

    d.driver_name = body.driver_name or d.driver_name
    d.driver_phone = body.driver_phone or d.driver_phone
    d.vehicle_code = body.vehicle_code or d.vehicle_code
    d.dispatch_note = body.dispatch_note or d.dispatch_note

    audit = AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.display_name,
        actor_role=current_user.role,
        action="ASSIGN_DELIVERY",
        category="DISPATCH",
        entity_type="delivery",
        entity_id=delivery_id,
        details=f"Assigned delivery {delivery_id[:8]} to driver {body.driver_name} / vehicle {body.vehicle_code}",
    )
    db.add(audit)
    db.commit()
    return {"message": "Delivery assignment updated."}


@router.patch("/{delivery_id}/status", response_model=DeliveryOut)
def update_delivery_status(
    delivery_id: str,
    request: Request,
    body: DeliveryStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("LOGISTICS_COORDINATOR", "FIELD_DISPATCHER", "SYSTEM_ADMIN")),
):
    """
    Advance delivery status through the state machine:
    ASSIGNED → DISPATCHED → IN_TRANSIT → DELIVERED
    FAILED requires a reason and can only come from IN_TRANSIT.
    Restricted to logistics/admin roles.
    Idempotent on retries.
    """
    idem_key = get_idempotency_key(request)
    if idem_key:
        cached = find_idempotency_record(db, idem_key)
        if cached:
            return respond_with_cached_record(cached)

    d = db.query(Delivery).options(
        joinedload(Delivery.items),
        joinedload(Delivery.timeline_events),
        joinedload(Delivery.warehouse),
        joinedload(Delivery.request).joinedload(AssistanceRequest.location),
    ).filter(Delivery.id == delivery_id).with_for_update().first()

    if not d:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Delivery not found.", "details": {}}})

    new_status = body.status.value

    # Idempotent retry: if delivery is already at requested status, return safely without duplicate side effects
    if d.status == new_status:
        out = _delivery_to_out(d)
        if idem_key:
            save_idempotency_record(db, idem_key, current_user.id, f"/api/v1/deliveries/{delivery_id}/status", 200, out)
        return out

    allowed = VALID_TRANSITIONS.get(d.status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_TRANSITION",
                    "message": f"Cannot transition from {d.status} to {new_status}. Allowed: {allowed or 'none (terminal state)'}.",
                    "details": {"current_status": d.status, "requested_status": new_status},
                }
            },
        )

    if new_status == "FAILED" and (not body.failure_reason or not body.failure_reason.strip()):
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "MISSING_FAILURE_REASON",
                    "message": "Failure reason is required when marking a delivery as FAILED.",
                    "details": {},
                }
            },
        )

    now = datetime.now(timezone.utc)
    d.status = new_status
    d.updated_at = now

    if new_status == "DISPATCHED":
        d.dispatched_at = now
        req = db.query(AssistanceRequest).filter(AssistanceRequest.id == d.request_id).with_for_update().first()
        if req and req.status in ("PENDING", "ALLOCATED", "PARTIALLY_ALLOCATED"):
            req.status = "DISPATCHED"
    elif new_status == "DELIVERED":
        d.delivered_at = now
    elif new_status == "FAILED":
        d.failure_reason = body.failure_reason

    event_texts = {
        "DISPATCHED": "Convoy departed depot logistics staging bay.",
        "IN_TRANSIT": "En-route across flood inundated corridor.",
        "DELIVERED": "Relief cargo received and verified on-site by shelter incharge.",
        "FAILED": f"Delivery failed: {body.failure_reason}",
    }

    db.add(DeliveryTimeline(
        id=str(uuid.uuid4()),
        delivery_id=delivery_id,
        event_text=event_texts.get(new_status, f"Status updated to {new_status}"),
        status=new_status,
        note=body.note or "",
        created_at=now,
    ))

    # On DELIVERED: deduct on_hand stock and release reservations strictly from this delivery's source warehouse
    if new_status == "DELIVERED":
        wh_id = d.warehouse_id
        for item in d.items:
            inv = (
                db.query(InventoryItem)
                .filter(InventoryItem.warehouse_id == wh_id, InventoryItem.item_type == item.item_type)
                .with_for_update()
                .first()
            )
            if inv:
                # Stock is physically handed over — deduct on_hand and release reserved
                inv.quantity_on_hand = max(0, inv.quantity_on_hand - item.quantity)
                inv.quantity_reserved = max(0, inv.quantity_reserved - item.quantity)
                db.add(StockMovement(
                    id=str(uuid.uuid4()),
                    warehouse_id=wh_id,
                    item_type=item.item_type,
                    quantity_delta=-item.quantity,
                    balance_after=inv.quantity_on_hand,
                    reason=f"Delivery {d.id[:8]} completed for request {d.request.reference_code if d.request else d.request_id[:8]}",
                    actor_id=current_user.id,
                    actor_name=current_user.display_name,
                ))

        # Update assistance request status accurately
        req = db.query(AssistanceRequest).options(joinedload(AssistanceRequest.items)).filter(
            AssistanceRequest.id == d.request_id
        ).with_for_update().first()
        if req and req.status not in ("CLOSED",):
            all_delivs = db.query(Delivery).filter(Delivery.request_id == req.id).all()
            all_completed = all(deliv.status == "DELIVERED" or deliv.id == d.id for deliv in all_delivs)
            any_active = any(deliv.status in ("DISPATCHED", "IN_TRANSIT") and deliv.id != d.id for deliv in all_delivs)

            total_req = sum(i.quantity_requested for i in req.items)
            total_alloc = sum(i.quantity_allocated for i in req.items)
            if all_completed and total_alloc >= total_req:
                req.status = "FULFILLED"
            elif any_active:
                req.status = "DISPATCHED"

    # On FAILED: safely release reservations from warehouse and restore request demand/status
    elif new_status == "FAILED":
        wh_id = d.warehouse_id
        for item in d.items:
            inv = (
                db.query(InventoryItem)
                .filter(InventoryItem.warehouse_id == wh_id, InventoryItem.item_type == item.item_type)
                .with_for_update()
                .first()
            )
            if inv:
                # Release reserved stock back to available pool
                inv.quantity_reserved = max(0, inv.quantity_reserved - item.quantity)
                db.add(StockMovement(
                    id=str(uuid.uuid4()),
                    warehouse_id=wh_id,
                    item_type=item.item_type,
                    quantity_delta=0,
                    balance_after=inv.quantity_on_hand - inv.quantity_reserved,
                    reason=f"Released reservation for failed delivery {d.id[:8]}: {body.failure_reason}",
                    actor_id=current_user.id,
                    actor_name=current_user.display_name,
                ))

        # Restore request demand & status
        req = db.query(AssistanceRequest).options(joinedload(AssistanceRequest.items)).filter(
            AssistanceRequest.id == d.request_id
        ).with_for_update().first()
        if req:
            for item in d.items:
                req_item = next((ri for ri in req.items if ri.item_type == item.item_type), None)
                if req_item:
                    req_item.quantity_allocated = max(0, req_item.quantity_allocated - item.quantity)

            # Check remaining active deliveries for this request
            other_delivs = db.query(Delivery).filter(
                Delivery.request_id == req.id,
                Delivery.id != d.id,
                Delivery.status.in_(["ASSIGNED", "DISPATCHED", "IN_TRANSIT"])
            ).all()
            total_alloc = sum(i.quantity_allocated for i in req.items)
            if any(od.status in ("DISPATCHED", "IN_TRANSIT") for od in other_delivs):
                req.status = "DISPATCHED"
            elif total_alloc > 0:
                req.status = "PARTIALLY_ALLOCATED"
            else:
                req.status = "PENDING"

    audit = AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.display_name,
        actor_role=current_user.role,
        action="ADVANCE_DELIVERY",
        category="DISPATCH",
        entity_type="delivery",
        entity_id=delivery_id,
        details=f"Delivery {delivery_id[:8]} advanced to {new_status}. {body.note or ''}",
    )
    db.add(audit)
    db.commit()
    db.refresh(d)
    out = _delivery_to_out(d)
    if idem_key:
        save_idempotency_record(db, idem_key, current_user.id, f"/api/v1/deliveries/{delivery_id}/status", 200, out)
    return out

