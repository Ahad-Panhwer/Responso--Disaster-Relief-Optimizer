"""Allocation run routes — create, approve, reject with transactional stock checking."""
import uuid
import json
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.config import settings
from app.models.models import (
    User, AssistanceRequest, Warehouse, AllocationRun, AllocationLine,
    Delivery, DeliveryItem, DeliveryTimeline, InventoryItem, StockMovement, AuditEvent, RequestItem
)
from app.schemas.schemas import AllocationRunCreate, AllocationRunOut, AllocationLineOut, ApproveRunRequest, RejectRunRequest
from app.api.deps import get_current_user, coordinator_or_admin
from app.allocation.engine import run_allocation, WeightConfig
from app.core.idempotency import (
    get_idempotency_key,
    find_idempotency_record,
    save_idempotency_record,
    respond_with_cached_record,
)

router = APIRouter()

DRIVER_NAMES = [
    ("Imran Qureshi", "+92 300 882-9901"),
    ("Zainab Baloch", "+92 301 992-3412"),
    ("Ghulam Mustafa Soomro", "+92 302 774-5511"),
    ("Sajjad Ali Chandio", "+92 303 551-9922"),
    ("Ustad Rasheed Ahmed", "+92 300 441-2301"),
    ("Muhammad Aslam Khan", "+92 302 881-2399"),
]

SUPPLY_WEIGHTS = {
    "water": 10.0,
    "food": 24.0,
    "medical": 4.5,
    "shelter": 18.0,
    "hygiene": 3.5,
}


def _run_to_out(run: AllocationRun) -> AllocationRunOut:
    lines_out = [
        AllocationLineOut(
            id=line.id,
            request_id=line.request_id,
            warehouse_id=line.warehouse_id,
            item_type=line.item_type,
            quantity_recommended=line.quantity_recommended,
            quantity_approved=line.quantity_approved,
            distance_km=line.distance_km,
            priority_score=line.priority_score,
            explanation=line.explanation,
            factors_json=line.factors_json,
        )
        for line in run.lines
    ]
    return AllocationRunOut(
        id=run.id,
        algorithm_version=run.algorithm_version,
        status=run.status,
        is_stale=run.is_stale,
        stale_reason=run.stale_reason or "",
        weights_json=run.weights_json or "{}",
        totals_json=run.totals_json or "{}",
        summary=run.summary or "",
        lines=lines_out,
        created_at=run.created_at,
        reviewed_at=run.reviewed_at,
        reviewed_by_name=run.reviewed_by_name or "",
        review_notes=run.review_notes or "",
    )


@router.post("/", response_model=AllocationRunOut, status_code=201)
def create_allocation_run(
    body: AllocationRunCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(coordinator_or_admin),
):
    """
    Run the allocation engine on current requests and stock.
    Creates a DRAFT recommendation — does NOT consume any stock.
    """
    # Load eligible requests (exclude FULFILLED and CLOSED)
    requests = (
        db.query(AssistanceRequest)
        .options(joinedload(AssistanceRequest.items), joinedload(AssistanceRequest.location))
        .filter(AssistanceRequest.status.notin_(["FULFILLED", "CLOSED"]))
        .all()
    )

    warehouses = (
        db.query(Warehouse)
        .options(joinedload(Warehouse.inventory_items), joinedload(Warehouse.location))
        .filter(Warehouse.is_active == True)
        .all()
    )

    if not requests:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "NO_ELIGIBLE_REQUESTS", "message": "No eligible requests to allocate.", "details": {}}},
        )
    if not warehouses:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "NO_WAREHOUSES", "message": "No active warehouses found.", "details": {}}},
        )

    # Build weight config
    if body.weights:
        w = WeightConfig(
            urgency_weight=body.weights.urgency_weight,
            population_weight=body.weights.population_weight,
            waiting_time_weight=body.weights.waiting_time_weight,
            distance_weight=body.weights.distance_weight,
        )
    else:
        w = WeightConfig()

    # Run the engine
    result = run_allocation(requests, warehouses, w)

    run = AllocationRun(
        id=str(uuid.uuid4()),
        created_by_id=current_user.id,
        algorithm_version=settings.ALGORITHM_VERSION,
        status="DRAFT",
        is_stale=False,
        summary=result.summary,
        weights_json=json.dumps(w.to_dict()),
        totals_json=json.dumps(result.totals),
    )
    db.add(run)
    db.flush()

    for line_result in result.lines:
        db.add(AllocationLine(
            id=str(uuid.uuid4()),
            allocation_run_id=run.id,
            request_id=line_result.request_id,
            warehouse_id=line_result.warehouse_id,
            item_type=line_result.item_type,
            quantity_recommended=line_result.quantity_recommended,
            distance_km=line_result.distance_km,
            priority_score=line_result.priority_score,
            explanation=line_result.explanation,
            factors_json=json.dumps(line_result.factors.to_dict()),
        ))

    audit = AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.display_name,
        actor_role=current_user.role,
        action="CREATE_ALLOCATION_RUN",
        category="ALLOCATION",
        entity_type="allocation_run",
        entity_id=run.id,
        details=f"Generated allocation run v{settings.ALGORITHM_VERSION}: {len(result.lines)} recommendation lines. {result.summary}",
    )
    db.add(audit)
    db.commit()
    db.refresh(run)
    return _run_to_out(run)


@router.get("/", response_model=List[AllocationRunOut])
def list_runs(db: Session = Depends(get_db), _ = Depends(get_current_user)):
    runs = (
        db.query(AllocationRun)
        .options(joinedload(AllocationRun.lines))
        .order_by(AllocationRun.created_at.desc())
        .all()
    )
    return [_run_to_out(r) for r in runs]


@router.get("/{run_id}", response_model=AllocationRunOut)
def get_run(run_id: str, db: Session = Depends(get_db), _ = Depends(get_current_user)):
    run = db.query(AllocationRun).options(joinedload(AllocationRun.lines)).filter(AllocationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Allocation run not found.", "details": {}}})
    return _run_to_out(run)


@router.post("/{run_id}/approve", response_model=AllocationRunOut)
def approve_run(
    run_id: str,
    request: Request,
    body: ApproveRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(coordinator_or_admin),
):
    """
    Approve an allocation run.
    - Re-checks stock availability atomically
    - Returns 409 if stock changed since the run was created (stale)
    - Deducts reserved quantities from warehouses
    - Creates delivery records matching each source warehouse
    - Marks other DRAFT runs as stale
    - Idempotent on retried execution
    """
    idem_key = get_idempotency_key(request)
    if idem_key:
        cached = find_idempotency_record(db, idem_key)
        if cached:
            return respond_with_cached_record(cached)

    run = (
        db.query(AllocationRun)
        .options(joinedload(AllocationRun.lines))
        .filter(AllocationRun.id == run_id)
        .with_for_update()
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Run not found.", "details": {}}})
    if run.status != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_STATUS", "message": f"Run is already {run.status}; only DRAFT runs can be approved.", "details": {}}},
        )

    if run.is_stale:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "STALE_RUN", "message": f"This run is stale: {run.stale_reason}. Please re-run the optimizer.", "details": {}}},
        )

    # Group lines by warehouse + item_type to compute total reservation needed
    needed: dict = {}  # {(wh_id, item_type): total_qty}
    for line in run.lines:
        key = (line.warehouse_id, line.item_type)
        needed[key] = needed.get(key, 0) + line.quantity_recommended

    # Re-check stock atomically (with_for_update locks rows)
    for (wh_id, item_type), qty_needed in needed.items():
        inv = (
            db.query(InventoryItem)
            .filter(InventoryItem.warehouse_id == wh_id, InventoryItem.item_type == item_type)
            .with_for_update()
            .first()
        )
        if inv is None:
            raise HTTPException(
                status_code=409,
                detail={"error": {"code": "STOCK_MISSING", "message": f"No inventory record for {item_type} at warehouse {wh_id}.", "details": {}}},
            )
        available = inv.quantity_on_hand - inv.quantity_reserved
        if available < qty_needed:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": {
                        "code": "INSUFFICIENT_STOCK",
                        "message": f"Stock changed since this run was created. Available {item_type} at warehouse {wh_id}: {available} (need {qty_needed}). Please re-run the optimizer.",
                        "details": {"item_type": item_type, "warehouse_id": wh_id, "available": available, "needed": qty_needed},
                    }
                },
            )

    # Commit reservations
    now = datetime.now(timezone.utc)
    for (wh_id, item_type), qty_needed in needed.items():
        inv = (
            db.query(InventoryItem)
            .filter(InventoryItem.warehouse_id == wh_id, InventoryItem.item_type == item_type)
            .first()
        )
        inv.quantity_reserved += qty_needed

        # Record stock movement
        db.add(StockMovement(
            id=str(uuid.uuid4()),
            warehouse_id=wh_id,
            item_type=item_type,
            quantity_delta=-qty_needed,
            balance_after=inv.quantity_on_hand - inv.quantity_reserved,
            reason=f"Reserved for allocation run approval {run_id[:8]}",
            actor_id=current_user.id,
            actor_name=current_user.display_name,
        ))

    # Mark approved quantities on lines
    for line in run.lines:
        line.quantity_approved = line.quantity_recommended

    # Group lines by (request_id, warehouse_id) to create distinct deliveries per source warehouse
    deliveries_map: dict = {}
    for line in run.lines:
        if line.quantity_recommended and line.quantity_recommended > 0:
            key = (line.request_id, line.warehouse_id)
            if key not in deliveries_map:
                deliveries_map[key] = []
            deliveries_map[key].append(line)

    delivery_index = 0
    for (req_id, wh_id), lines_for_delivery in deliveries_map.items():
        delivery_index += 1
        wh = db.query(Warehouse).filter(Warehouse.id == wh_id).first()
        driver_name, driver_phone = DRIVER_NAMES[delivery_index % len(DRIVER_NAMES)]
        cargo_weight = sum(l.quantity_recommended * SUPPLY_WEIGHTS.get(l.item_type, 1.0) for l in lines_for_delivery)

        delivery = Delivery(
            id=str(uuid.uuid4()),
            allocation_run_id=run.id,
            request_id=req_id,
            warehouse_id=wh_id,
            status="ASSIGNED",
            vehicle_code=f"CONVOY-{wh.code if wh else 'DEPOT'}-{delivery_index}",
            driver_name=driver_name,
            driver_phone=driver_phone,
            distance_km=lines_for_delivery[0].distance_km,
            eta_minutes=max(15, int(lines_for_delivery[0].distance_km * 1.8)),
            capacity_units=cargo_weight,
            created_at=now,
            updated_at=now,
        )
        db.add(delivery)
        db.flush()

        # Add delivery items for this specific source warehouse
        for line in lines_for_delivery:
            db.add(DeliveryItem(
                id=str(uuid.uuid4()),
                delivery_id=delivery.id,
                item_type=line.item_type,
                quantity=line.quantity_recommended,
            ))

        # Initial timeline event
        db.add(DeliveryTimeline(
            id=str(uuid.uuid4()),
            delivery_id=delivery.id,
            event_text=f"Allocation run approved by {current_user.display_name}. Convoy dispatched from {wh.name if wh else wh_id}.",
            status="ASSIGNED",
            note=body.notes,
            created_at=now,
        ))

    # Update request items allocated quantities and request statuses across all lines in this run
    req_ids = set(line.request_id for line in run.lines if line.quantity_recommended and line.quantity_recommended > 0)
    for req_id in req_ids:
        req = db.query(AssistanceRequest).options(joinedload(AssistanceRequest.items)).filter(AssistanceRequest.id == req_id).first()
        if not req:
            continue
        for item in req.items:
            alloc_for_item = sum(l.quantity_recommended for l in run.lines if l.request_id == req_id and l.item_type == item.item_type and l.quantity_recommended)
            item.quantity_allocated = min(item.quantity_requested, item.quantity_allocated + alloc_for_item)

        total_requested = sum(i.quantity_requested for i in req.items)
        total_allocated = sum(i.quantity_allocated for i in req.items)
        if total_allocated >= total_requested:
            req.status = "ALLOCATED"
        elif total_allocated > 0:
            req.status = "PARTIALLY_ALLOCATED"

    # Approve the run
    run.status = "APPROVED"
    run.is_stale = False
    run.reviewed_at = now
    run.reviewed_by_id = current_user.id
    run.reviewed_by_name = current_user.display_name
    run.review_notes = body.notes

    # Mark all other DRAFT runs as stale
    db.query(AllocationRun).filter(
        AllocationRun.status == "DRAFT",
        AllocationRun.id != run_id,
    ).update(
        {"is_stale": True, "stale_reason": f"Run {run_id[:8]} was approved and stock was committed."},
        synchronize_session=False,
    )

    audit = AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.display_name,
        actor_role=current_user.role,
        action="APPROVE_ALLOCATION_RUN",
        category="ALLOCATION",
        entity_type="allocation_run",
        entity_id=run_id,
        details=f"Approved allocation run {run_id[:8]}. {len(deliveries_map)} deliveries created. Notes: {body.notes or 'None'}",
    )
    db.add(audit)
    db.commit()
    db.refresh(run)
    out = _run_to_out(run)
    if idem_key:
        save_idempotency_record(db, idem_key, current_user.id, f"/api/v1/allocations/{run_id}/approve", 200, out)
    return out



@router.post("/{run_id}/reject", response_model=AllocationRunOut)
def reject_run(
    run_id: str,
    body: RejectRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(coordinator_or_admin),
):
    """Reject a DRAFT allocation run. Requires a reason."""
    run = db.query(AllocationRun).options(joinedload(AllocationRun.lines)).filter(AllocationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Run not found.", "details": {}}})
    if run.status != "DRAFT":
        raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_STATUS", "message": f"Only DRAFT runs can be rejected. Current status: {run.status}", "details": {}}})

    run.status = "REJECTED"
    run.reviewed_at = datetime.now(timezone.utc)
    run.reviewed_by_id = current_user.id
    run.reviewed_by_name = current_user.display_name
    run.review_notes = body.reason

    audit = AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.display_name,
        actor_role=current_user.role,
        action="REJECT_ALLOCATION_RUN",
        category="ALLOCATION",
        entity_type="allocation_run",
        entity_id=run_id,
        details=f"Rejected allocation run {run_id[:8]}. Reason: {body.reason}",
    )
    db.add(audit)
    db.commit()
    db.refresh(run)
    return _run_to_out(run)
