"""FastAPI dependency functions for auth and role checking."""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.models import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate the current user from the Authorization header."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "MISSING_TOKEN", "message": "Authentication required.", "details": {}}},
        )

    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_TOKEN", "message": "Token is invalid or expired.", "details": {}}},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_TOKEN", "message": "Token payload is invalid.", "details": {}}},
        )

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "USER_NOT_FOUND", "message": "User account not found or inactive.", "details": {}}},
        )

    return user


def require_roles(*roles: str):
    """Return a dependency that enforces role membership."""
    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "INSUFFICIENT_ROLE",
                        "message": f"Your role ({current_user.role}) is not authorized for this action.",
                        "details": {"required_roles": list(roles)},
                    }
                },
            )
        return current_user
    return _check


def admin_only(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "SYSTEM_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "ADMIN_ONLY", "message": "System Administrator role required.", "details": {}}},
        )
    return current_user


def coordinator_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("LOGISTICS_COORDINATOR", "SYSTEM_ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "INSUFFICIENT_ROLE", "message": "Coordinator or Admin role required.", "details": {}}},
        )
    return current_user
