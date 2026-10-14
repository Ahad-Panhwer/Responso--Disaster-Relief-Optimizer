"""Assistance request routes — full CRUD with role enforcement."""
import uuid
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.models.models import User, Location, AssistanceRequest, RequestItem, AuditEvent, AllocationRun
from app.schemas.schemas import RequestCreate, RequestUpdate, RequestOut, RequestItemOut, LocationOut
from app.api.deps import get_current_user
from app.core.idempotency import (
    get_idempotency_key,
    find_idempotency_record,
    save_idempotency_record,
    respond_with_cached_record,
)

router = APIRouter()


def _make_ref_code(db: Session) -> str:
    """
    Generate a unique sequential reference code like REQ-0001.
    Safe against record deletions and gaps by finding max numerical index.
    """
    all_codes = db.query(AssistanceRequest.reference_code).all()
    max_num = 0
    pattern = re.compile(r"^REQ-(\d+)$", re.IGNORECASE)
    for (code,) in all_codes:
        if code:
            m = pattern.match(code.strip())
            if m:
                try:
                    num = int(m.group(1))
                    if num > max_num:
                        max_num = num
                except ValueError:
                    pass
    return f"REQ-{max_num + 1:04d}"


def _request_to_out(req: AssistanceRequest) -> RequestOut:
    loc = req.location
    loc_out = LocationOut(
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
    )
    items_out = [
        RequestItemOut(
            id=item.id,
            item_type=item.item_type,
            quantity_requested=item.quantity_requested,
            quantity_allocated=item.quantity_allocated,
        )
        for item in req.items
    ]
    return RequestOut(
        id=req.id,
        reference_code=req.reference_code,
        location=loc_out,
        urgency=req.urgency,
        affected_population=req.affected_population,
        affected_households=req.affected_households,
        vulnerable_count=req.vulnerable_count,
        access_status=req.access_status,
        flood_depth_meters=req.flood_depth_meters,
        contact_person=req.contact_person,
        contact_phone=req.contact_phone,
        status=req.status,
        description=req.description,
        items=items_out,
        created_at=req.created_at,
        updated_at=req.updated_at,
        closed_at=req.closed_at,
    )


@router.get("/", response_model=List[RequestOut])
def list_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    urgency_filter: Optional[str] = Query(None, alias="urgency"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List assistance requests with optional filters."""
    q = db.query(AssistanceRequest).options(
        joinedload(AssistanceRequest.location),
        joinedload(AssistanceRequest.items),
    )
    if status_filter:
        q = q.filter(AssistanceRequest.status == status_filter.upper())
    if urgency_filter:
        q = q.filter(AssistanceRequest.urgency == urgency_filter.upper())
    return [_request_to_out(r) for r in q.order_by(AssistanceRequest.created_at.desc()).all()]


@router.post("/", response_model=RequestOut, status_code=201)
def create_request(
    request: Request,
    body: RequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new assistance request. Any authenticated user may create."""
    idem_key = get_idempotency_key(request)
    if idem_key:
        cached = find_idempotency_record(db, idem_key)
        if cached:
            return respond_with_cached_record(cached)

    max_attempts = 5
    for attempt in range(max_attempts):
        try:
            # Create location
            loc = Location(
                id=str(uuid.uuid4()),
                name=body.location.name,
                location_type=body.location.location_type,
                latitude=body.location.latitude,
                longitude=body.location.longitude,
                district=body.location.district,
                tehsil=body.location.tehsil,
                union_council=body.location.union_council,
                zone=body.location.zone,
                notes=body.location.notes,
                is_simulated=body.location.is_simulated,
            )
            db.add(loc)
            db.flush()

            ref_code = _make_ref_code(db)
            # Guard against edge-case where ref_code exists in concurrent transaction
            while db.query(AssistanceRequest).filter(AssistanceRequest.reference_code == ref_code).first():
                parts = ref_code.split("-")
                num = int(parts[1]) + 1 if len(parts) > 1 and parts[1].isdigit() else 1
                ref_code = f"REQ-{num:04d}"

            req = AssistanceRequest(
                id=str(uuid.uuid4()),
                reference_code=ref_code,
                location_id=loc.id,
                urgency=body.urgency.value,
                affected_population=body.affected_population,
                affected_households=body.affected_households,
                vulnerable_count=body.vulnerable_count,
                access_status=body.access_status.value,
                flood_depth_meters=body.flood_depth_meters,
                contact_person=body.contact_person,
                contact_phone=body.contact_phone,
                description=body.description,
                created_by_id=current_user.id,
            )
            db.add(req)
            db.flush()

            for item in body.items:
                db.add(RequestItem(
                    id=str(uuid.uuid4()),
                    request_id=req.id,
                    item_type=item.item_type,
                    quantity_requested=item.quantity_requested,
                ))

            # Mark existing DRAFT runs as stale
            db.query(AllocationRun).filter(AllocationRun.status == "DRAFT").update(
                {"is_stale": True, "stale_reason": f"New request {req.reference_code} registered for {loc.name}"},
                synchronize_session=False,
            )

            audit = AuditEvent(
                actor_id=current_user.id,
                actor_name=current_user.display_name,
                actor_role=current_user.role,
                action="CREATE_REQUEST",
                category="REQUEST",
                entity_type="assistance_request",
                entity_id=req.id,
                details=f"Created request {req.reference_code} for {loc.name} ({body.urgency.value} urgency, {body.affected_population} affected)",
            )
            db.add(audit)
            db.commit()
            db.refresh(req)
            out = _request_to_out(req)
            if idem_key:
                save_idempotency_record(db, idem_key, current_user.id, "/api/v1/requests/", 201, out)
            return out
        except IntegrityError:
            db.rollback()
            if attempt == max_attempts - 1:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={"error": {"code": "CONCURRENT_COLLISION", "message": "Failed to generate unique reference code due to concurrent requests. Please retry.", "details": {}}},
                )



@router.get("/{request_id}", response_model=RequestOut)
def get_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(AssistanceRequest).options(
        joinedload(AssistanceRequest.location),
        joinedload(AssistanceRequest.items),
    ).filter(AssistanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Assistance request not found.", "details": {}}},
        )
    return _request_to_out(req)


@router.patch("/{request_id}", response_model=RequestOut)
def update_request(
    request_id: str,
    body: RequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a request. Coordinators and admins can update any; others update their own."""
    req = db.query(AssistanceRequest).options(
        joinedload(AssistanceRequest.location),
        joinedload(AssistanceRequest.items),
    ).filter(AssistanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Request not found.", "details": {}}})
    if req.status == "CLOSED":
        raise HTTPException(status_code=400, detail={"error": {"code": "REQUEST_CLOSED", "message": "Cannot update a closed request.", "details": {}}})

    for key, value in body.model_dump(exclude_none=True).items():
        val = value.value if hasattr(value, 'value') else value
        setattr(req, key, val)

    db.query(AllocationRun).filter(AllocationRun.status == "DRAFT").update(
        {"is_stale": True, "stale_reason": f"Request {req.reference_code} was updated"},
        synchronize_session=False,
    )

    audit = AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.display_name,
        actor_role=current_user.role,
        action="UPDATE_REQUEST",
        category="REQUEST",
        entity_type="assistance_request",
        entity_id=request_id,
        details=f"Updated request {req.reference_code}: {list(body.model_dump(exclude_none=True).keys())}",
    )
    db.add(audit)
    db.commit()
    db.refresh(req)
    return _request_to_out(req)


@router.post("/{request_id}/close", response_model=RequestOut)
def close_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Close a request. Coordinators and admins only."""
    if current_user.role not in ("LOGISTICS_COORDINATOR", "SYSTEM_ADMIN"):
        raise HTTPException(status_code=403, detail={"error": {"code": "INSUFFICIENT_ROLE", "message": "Coordinator or Admin required.", "details": {}}})

    req = db.query(AssistanceRequest).options(
        joinedload(AssistanceRequest.location),
        joinedload(AssistanceRequest.items),
    ).filter(AssistanceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Request not found.", "details": {}}})
    if req.status == "CLOSED":
        raise HTTPException(status_code=400, detail={"error": {"code": "ALREADY_CLOSED", "message": "Request is already closed.", "details": {}}})

    from datetime import datetime, timezone
    req.status = "CLOSED"
    req.closed_at = datetime.now(timezone.utc)

    audit = AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.display_name,
        actor_role=current_user.role,
        action="CLOSE_REQUEST",
        category="REQUEST",
        entity_type="assistance_request",
        entity_id=request_id,
        details=f"Closed request {req.reference_code}",
    )
    db.add(audit)
    db.commit()
    db.refresh(req)
    return _request_to_out(req)
