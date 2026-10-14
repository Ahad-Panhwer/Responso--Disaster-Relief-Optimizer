"""Idempotency management for resilient API mutations."""
import json
import uuid
from typing import Optional, Any
from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.models.models import IdempotencyRecord


def get_idempotency_key(request: Request) -> Optional[str]:
    """Extract idempotency key from headers (Idempotency-Key or X-Idempotency-Key)."""
    raw = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key")
    if raw:
        cleaned = raw.strip()
        return cleaned if cleaned else None
    return None


def find_idempotency_record(db: Session, key: str) -> Optional[IdempotencyRecord]:
    """Retrieve existing cached response by idempotency key."""
    if not key:
        return None
    return db.query(IdempotencyRecord).filter(IdempotencyRecord.key == key).first()


def save_idempotency_record(
    db: Session,
    key: str,
    user_id: Optional[str],
    endpoint: str,
    status_code: int,
    data: Any,
) -> Optional[IdempotencyRecord]:
    """Save an execution result for an idempotency key."""
    if not key:
        return None

    # Handle Pydantic models or raw dicts
    if hasattr(data, "model_dump"):
        serialized = json.dumps(data.model_dump(mode="json"))
    elif isinstance(data, (dict, list)):
        serialized = json.dumps(data)
    elif isinstance(data, str):
        serialized = data
    else:
        serialized = json.dumps(str(data))

    record = IdempotencyRecord(
        id=str(uuid.uuid4()),
        key=key,
        user_id=user_id,
        endpoint=endpoint,
        status_code=status_code,
        response_body=serialized,
    )
    db.add(record)
    try:
        db.commit()
        db.refresh(record)
        return record
    except Exception:
        db.rollback()
        return None


def respond_with_cached_record(record: IdempotencyRecord) -> JSONResponse:
    """Format stored record as JSONResponse."""
    try:
        content = json.loads(record.response_body)
    except Exception:
        content = record.response_body
    return JSONResponse(status_code=record.status_code, content=content)
