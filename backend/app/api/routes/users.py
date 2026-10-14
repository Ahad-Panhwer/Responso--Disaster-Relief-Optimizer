"""User management routes — admin only for list/create; any user can update self."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import hash_password
from app.models.models import User, AuditEvent
from app.schemas.schemas import UserCreate, UserUpdate, UserOut
from app.api.deps import get_current_user, admin_only

router = APIRouter()


@router.get("/", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    """List all users (admin only)."""
    return db.query(User).all()


@router.post("/", response_model=UserOut, status_code=201)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    """Create a new user (admin only)."""
    email = body.email.lower().strip()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "DUPLICATE_EMAIL", "message": "A user with this email already exists.", "details": {}}},
        )

    user = User(
        email=email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        role=body.role.value,
        role_title=body.role_title,
        department=body.department,
    )
    db.add(user)

    audit = AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.display_name,
        actor_role=current_user.role,
        action="CREATE_USER",
        category="SECURITY",
        entity_type="user",
        entity_id=user.id,
        details=f"Created user {email} with role {body.role.value}",
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a user. Admins can update any user; others can only update themselves."""
    if current_user.id != user_id and current_user.role != "SYSTEM_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "INSUFFICIENT_ROLE", "message": "You can only update your own account.", "details": {}}},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "User not found.", "details": {}}},
        )

    update_data = body.model_dump(exclude_none=True)
    SAFE_SELF_UPDATE_FIELDS = {"display_name", "department", "role_title"}
    if current_user.role != "SYSTEM_ADMIN":
        disallowed = set(update_data.keys()) - SAFE_SELF_UPDATE_FIELDS
        if disallowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "ADMIN_ONLY",
                        "message": f"Only administrators can modify privileged account properties: {', '.join(sorted(disallowed))}.",
                        "details": {"disallowed_fields": list(disallowed)},
                    }
                },
            )
    else:
        if "role" in update_data and hasattr(update_data["role"], "value"):
            update_data["role"] = update_data["role"].value

    for key, value in update_data.items():
        setattr(user, key, value)

    audit = AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.display_name,
        actor_role=current_user.role,
        action="UPDATE_USER",
        category="SECURITY",
        entity_type="user",
        entity_id=user_id,
        details=f"Updated user {user.email}: {list(update_data.keys())}",
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)
