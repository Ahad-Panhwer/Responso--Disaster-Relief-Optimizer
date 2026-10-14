"""Audit event log — admin only listing."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import User, AuditEvent
from app.schemas.schemas import AuditEventOut
from app.api.deps import admin_only

router = APIRouter()


@router.get("/", response_model=List[AuditEventOut])
def list_audit_events(
    category: Optional[str] = Query(None),
    limit: int = Query(200, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    """List audit events (admin only). Filtered by category, most recent first."""
    q = db.query(AuditEvent)
    if category:
        q = q.filter(AuditEvent.category == category.upper())
    events = q.order_by(AuditEvent.created_at.desc()).limit(limit).all()
    return [
        AuditEventOut(
            id=e.id,
            actor_name=e.actor_name or "",
            actor_role=e.actor_role or "",
            action=e.action,
            category=e.category,
            entity_type=e.entity_type or "",
            entity_id=e.entity_id or "",
            details=e.details or "",
            created_at=e.created_at,
        )
        for e in events
    ]
