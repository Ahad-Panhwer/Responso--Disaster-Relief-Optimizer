"""Authentication routes: login, current user, logout."""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.models.models import User, AuditEvent
from app.schemas.schemas import LoginRequest, TokenResponse, UserOut
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email and password; return JWT access token."""
    email = body.email.lower().strip()
    user = db.query(User).filter(User.email == email, User.is_active == True).first()

    if not user or not verify_password(body.password, user.password_hash):
        # Log failed attempt (no user details to avoid leaking existence)
        audit = AuditEvent(
            actor_name=email,
            actor_role="UNKNOWN",
            action="LOGIN_FAILED",
            category="SECURITY",
            entity_type="user",
            entity_id=email,
            details=f"Failed login attempt for {email}",
        )
        db.add(audit)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid email or password.", "details": {}}},
        )

    token = create_access_token(
        data={"sub": user.id, "role": user.role},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    # Audit successful login
    audit = AuditEvent(
        actor_id=user.id,
        actor_name=user.display_name,
        actor_role=user.role,
        action="LOGIN_SUCCESS",
        category="SECURITY",
        entity_type="user",
        entity_id=user.id,
        details=f"Successful login by {user.display_name} ({user.role})",
    )
    db.add(audit)
    db.commit()

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return UserOut.model_validate(current_user)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Logout endpoint. JWT tokens are stateless; this endpoint exists for
    audit logging. Clients should discard the token on their side.
    Token revocation is not implemented in this MVP — document this limitation.
    """
    audit = AuditEvent(
        actor_id=current_user.id,
        actor_name=current_user.display_name,
        actor_role=current_user.role,
        action="LOGOUT",
        category="SECURITY",
        entity_type="user",
        entity_id=current_user.id,
        details=f"User {current_user.display_name} logged out (token not revoked — stateless JWT).",
    )
    db.add(audit)
    db.commit()
    return {"message": "Logged out. Please discard your access token. Note: this MVP does not implement server-side token revocation."}
