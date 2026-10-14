"""Location routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import Location
from app.schemas.schemas import LocationCreate, LocationOut
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[LocationOut])
def list_locations(db: Session = Depends(get_db), _ = Depends(get_current_user)):
    return db.query(Location).all()
