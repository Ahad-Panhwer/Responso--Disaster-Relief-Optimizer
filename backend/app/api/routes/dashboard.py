"""Dashboard summary endpoint — all metrics from the database."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.models import (
    User, AssistanceRequest, RequestItem, Warehouse, InventoryItem, Delivery, AllocationRun
)
from app.schemas.schemas import DashboardSummary
from app.api.deps import get_current_user

router = APIRouter()

SUPPLY_TYPES = ["water", "food", "medical", "shelter", "hygiene"]


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db), _ = Depends(get_current_user)):
    """Return aggregated dashboard metrics from database."""

    # Request counts
    total_requests = db.query(AssistanceRequest).count()
    pending_requests = db.query(AssistanceRequest).filter(AssistanceRequest.status == "PENDING").count()
    critical_requests = db.query(AssistanceRequest).filter(
        AssistanceRequest.urgency == "CRITICAL",
        AssistanceRequest.status.notin_(["FULFILLED", "CLOSED"])
    ).count()
    allocated_requests = db.query(AssistanceRequest).filter(
        AssistanceRequest.status.in_(["ALLOCATED", "PARTIALLY_ALLOCATED"])
    ).count()
    fulfilled_requests = db.query(AssistanceRequest).filter(AssistanceRequest.status == "FULFILLED").count()

    # Delivery counts
    total_deliveries = db.query(Delivery).count()
    in_transit_deliveries = db.query(Delivery).filter(Delivery.status == "IN_TRANSIT").count()
    delivered_count = db.query(Delivery).filter(Delivery.status == "DELIVERED").count()

    # Inventory totals
    total_stock = {t: 0 for t in SUPPLY_TYPES}
    total_reserved = {t: 0 for t in SUPPLY_TYPES}
    total_available = {t: 0 for t in SUPPLY_TYPES}

    inv_rows = db.query(InventoryItem).all()
    for inv in inv_rows:
        if inv.item_type in total_stock:
            total_stock[inv.item_type] += inv.quantity_on_hand
            total_reserved[inv.item_type] += inv.quantity_reserved
            total_available[inv.item_type] += max(0, inv.quantity_on_hand - inv.quantity_reserved)

    # Unmet demand: sum of (requested - allocated) for non-fulfilled/closed requests
    unmet_demand = {t: 0 for t in SUPPLY_TYPES}
    active_items = (
        db.query(RequestItem)
        .join(AssistanceRequest)
        .filter(AssistanceRequest.status.notin_(["FULFILLED", "CLOSED"]))
        .all()
    )
    for item in active_items:
        if item.item_type in unmet_demand:
            unmet = max(0, item.quantity_requested - item.quantity_allocated)
            unmet_demand[item.item_type] += unmet

    # Active warehouses
    active_warehouses = db.query(Warehouse).filter(Warehouse.is_active == True).count()

    # Latest run
    latest_run = db.query(AllocationRun).order_by(AllocationRun.created_at.desc()).first()

    return DashboardSummary(
        total_requests=total_requests,
        pending_requests=pending_requests,
        critical_requests=critical_requests,
        allocated_requests=allocated_requests,
        fulfilled_requests=fulfilled_requests,
        total_deliveries=total_deliveries,
        in_transit_deliveries=in_transit_deliveries,
        delivered_count=delivered_count,
        total_stock=total_stock,
        total_reserved=total_reserved,
        total_available=total_available,
        unmet_demand=unmet_demand,
        active_warehouses=active_warehouses,
        latest_run_status=latest_run.status if latest_run else None,
        latest_run_id=latest_run.id if latest_run else None,
    )


@router.post("/reset-demo")
def reset_demo_data(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Reset database to initial simulated Sindh disaster scenario (Admin or Coordinator)."""
    from fastapi import HTTPException
    from app.seeds.seed_data import seed_database
    if current_user.role not in ("SYSTEM_ADMIN", "LOGISTICS_COORDINATOR"):
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "INSUFFICIENT_ROLE", "message": "Only Admin or Coordinator can reset demo data.", "details": {}}},
        )
    res = seed_database(db, reset=True)
    return {"message": "Demo data reset successfully to initial Sindh scenario.", "stats": res}

