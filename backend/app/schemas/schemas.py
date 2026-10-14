"""Pydantic schemas for all API request/response models."""
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    LOGISTICS_COORDINATOR = "LOGISTICS_COORDINATOR"
    FIELD_DISPATCHER = "FIELD_DISPATCHER"
    INVENTORY_MANAGER = "INVENTORY_MANAGER"
    SYSTEM_ADMIN = "SYSTEM_ADMIN"


class UrgencyLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"


class AccessStatus(str, Enum):
    CUT_OFF_ROAD = "CUT_OFF_ROAD"
    BOAT_ONLY = "BOAT_ONLY"
    ACCESSIBLE = "ACCESSIBLE"


class RequestStatus(str, Enum):
    PENDING = "PENDING"
    PARTIALLY_ALLOCATED = "PARTIALLY_ALLOCATED"
    ALLOCATED = "ALLOCATED"
    DISPATCHED = "DISPATCHED"
    FULFILLED = "FULFILLED"
    CLOSED = "CLOSED"


class DeliveryStatus(str, Enum):
    ASSIGNED = "ASSIGNED"
    DISPATCHED = "DISPATCHED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"


class RunStatus(str, Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    STALE = "STALE"


class AuditCategory(str, Enum):
    ALLOCATION = "ALLOCATION"
    INVENTORY = "INVENTORY"
    REQUEST = "REQUEST"
    DISPATCH = "DISPATCH"
    SECURITY = "SECURITY"
    SYSTEM = "SYSTEM"


VALID_ITEM_TYPES = {"water", "food", "medical", "shelter", "hygiene"}


# ─── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ─── Users ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str
    display_name: str
    role: UserRole = UserRole.FIELD_DISPATCHER
    role_title: str = ""
    department: str = ""

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.lower().strip()


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    role: Optional[UserRole] = None
    role_title: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    role_title: str
    department: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Locations ────────────────────────────────────────────────────────────────

class LocationCreate(BaseModel):
    name: str
    location_type: str = "community"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    district: str = ""
    tehsil: str = ""
    union_council: str = ""
    zone: str = ""
    notes: str = ""
    is_simulated: bool = True

    @field_validator("latitude")
    @classmethod
    def validate_lat(cls, v):
        if v is not None and not (-90 <= v <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_lng(cls, v):
        if v is not None and not (-180 <= v <= 180):
            raise ValueError("Longitude must be between -180 and 180")
        return v


class LocationOut(LocationCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Assistance Requests ──────────────────────────────────────────────────────

class RequestItemIn(BaseModel):
    item_type: str
    quantity_requested: int

    @field_validator("item_type")
    @classmethod
    def valid_item_type(cls, v: str) -> str:
        if v not in VALID_ITEM_TYPES:
            raise ValueError(f"item_type must be one of {VALID_ITEM_TYPES}")
        return v

    @field_validator("quantity_requested")
    @classmethod
    def positive_quantity(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("quantity_requested must be greater than 0")
        return v


class RequestCreate(BaseModel):
    location: LocationCreate
    urgency: UrgencyLevel
    affected_population: int
    affected_households: int = 0
    vulnerable_count: int = 0
    access_status: AccessStatus = AccessStatus.ACCESSIBLE
    flood_depth_meters: float = 0.0
    contact_person: str = ""
    contact_phone: str = ""
    items: List[RequestItemIn]
    description: str = ""

    @field_validator("affected_population")
    @classmethod
    def non_negative_pop(cls, v: int) -> int:
        if v < 0:
            raise ValueError("affected_population must be non-negative")
        return v

    @field_validator("items")
    @classmethod
    def at_least_one_item(cls, v: List[RequestItemIn]) -> List[RequestItemIn]:
        if not v:
            raise ValueError("At least one supply item is required")
        types = [i.item_type for i in v]
        if len(types) != len(set(types)):
            raise ValueError("Duplicate item types in a single request are not allowed")
        return v


class RequestUpdate(BaseModel):
    urgency: Optional[UrgencyLevel] = None
    affected_population: Optional[int] = None
    affected_households: Optional[int] = None
    vulnerable_count: Optional[int] = None
    access_status: Optional[AccessStatus] = None
    flood_depth_meters: Optional[float] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    description: Optional[str] = None


class RequestItemOut(BaseModel):
    id: str
    item_type: str
    quantity_requested: int
    quantity_allocated: int

    class Config:
        from_attributes = True


class RequestOut(BaseModel):
    id: str
    reference_code: str
    location: LocationOut
    urgency: str
    affected_population: int
    affected_households: int
    vulnerable_count: int
    access_status: str
    flood_depth_meters: float
    contact_person: str
    contact_phone: str
    status: str
    description: str
    items: List[RequestItemOut]
    created_at: datetime
    updated_at: Optional[datetime]
    closed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Warehouses ───────────────────────────────────────────────────────────────

class WarehouseCreate(BaseModel):
    location: LocationCreate
    name: str
    code: str
    capacity_kg: float = 50000.0
    available_delivery_trucks: int = 5
    contact_person: str = ""
    contact_phone: str = ""


class InventoryItemOut(BaseModel):
    id: str
    item_type: str
    quantity_on_hand: int
    quantity_reserved: int
    quantity_available: int

    class Config:
        from_attributes = True


class WarehouseOut(BaseModel):
    id: str
    name: str
    code: str
    capacity_kg: float
    available_delivery_trucks: int
    contact_person: str
    contact_phone: str
    is_active: bool
    location: LocationOut
    inventory: List[InventoryItemOut] = []
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Stock Movements ──────────────────────────────────────────────────────────

class StockMovementCreate(BaseModel):
    item_type: str
    quantity_delta: int
    reason: str

    @field_validator("item_type")
    @classmethod
    def valid_item(cls, v: str) -> str:
        if v not in VALID_ITEM_TYPES:
            raise ValueError(f"item_type must be one of {VALID_ITEM_TYPES}")
        return v

    @field_validator("quantity_delta")
    @classmethod
    def nonzero_delta(cls, v: int) -> int:
        if v == 0:
            raise ValueError("quantity_delta must be non-zero")
        return v

    @field_validator("reason")
    @classmethod
    def reason_required(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("A reason is required for stock movements")
        return v


class StockMovementOut(BaseModel):
    id: str
    warehouse_id: str
    item_type: str
    quantity_delta: int
    balance_after: int
    reason: str
    actor_name: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Allocation ───────────────────────────────────────────────────────────────

class AllocationWeights(BaseModel):
    urgency_weight: float = 0.55
    population_weight: float = 0.30
    waiting_time_weight: float = 0.15
    distance_weight: float = 0.0

    @model_validator(mode="after")
    def weights_reasonable(self) -> "AllocationWeights":
        total = self.urgency_weight + self.population_weight + self.waiting_time_weight + self.distance_weight
        if not (0.99 <= total <= 1.01):
            raise ValueError(f"Weights must sum to 1.0 (got {total:.3f})")
        return self


class AllocationRunCreate(BaseModel):
    weights: Optional[AllocationWeights] = None


class AllocationLineOut(BaseModel):
    id: str
    request_id: str
    warehouse_id: str
    item_type: str
    quantity_recommended: int
    quantity_approved: Optional[int]
    distance_km: float
    priority_score: float
    explanation: str
    factors_json: str

    class Config:
        from_attributes = True


class AllocationRunOut(BaseModel):
    id: str
    algorithm_version: str
    status: str
    is_stale: bool
    stale_reason: str
    weights_json: str
    totals_json: str
    summary: str
    lines: List[AllocationLineOut] = []
    created_at: datetime
    reviewed_at: Optional[datetime]
    reviewed_by_name: str
    review_notes: str

    class Config:
        from_attributes = True


class ApproveRunRequest(BaseModel):
    notes: str = ""


class RejectRunRequest(BaseModel):
    reason: str

    @field_validator("reason")
    @classmethod
    def reason_required(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("A rejection reason is required")
        return v


# ─── Deliveries ───────────────────────────────────────────────────────────────

class DeliveryAssign(BaseModel):
    driver_name: str = ""
    driver_phone: str = ""
    vehicle_code: str = ""
    dispatch_note: str = ""


class DeliveryStatusUpdate(BaseModel):
    status: DeliveryStatus
    note: str = ""
    failure_reason: str = ""

    @model_validator(mode="after")
    def failed_requires_reason(self) -> "DeliveryStatusUpdate":
        if self.status == DeliveryStatus.FAILED and not self.failure_reason.strip():
            raise ValueError("failure_reason is required when marking a delivery as FAILED")
        return self


class DeliveryTimelineOut(BaseModel):
    id: str
    event_text: str
    status: str
    note: str
    created_at: datetime

    class Config:
        from_attributes = True


class DeliveryItemOut(BaseModel):
    id: str
    item_type: str
    quantity: int

    class Config:
        from_attributes = True


class DeliveryOut(BaseModel):
    id: str
    allocation_run_id: Optional[str]
    request_id: str
    warehouse_id: str
    warehouse_name: Optional[str] = None
    warehouse_code: Optional[str] = None
    destination_community: Optional[str] = None
    destination_district: Optional[str] = None
    request_reference_code: Optional[str] = None
    status: str
    vehicle_code: str
    driver_name: str
    driver_phone: str
    distance_km: float
    eta_minutes: int
    dispatch_note: str
    failure_reason: str
    created_at: datetime
    updated_at: Optional[datetime]
    dispatched_at: Optional[datetime]
    delivered_at: Optional[datetime]
    items: List[DeliveryItemOut] = []
    timeline_events: List[DeliveryTimelineOut] = []

    class Config:
        from_attributes = True



# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_requests: int
    pending_requests: int
    critical_requests: int
    allocated_requests: int
    fulfilled_requests: int
    total_deliveries: int
    in_transit_deliveries: int
    delivered_count: int
    total_stock: Dict[str, int]
    total_reserved: Dict[str, int]
    total_available: Dict[str, int]
    unmet_demand: Dict[str, int]
    active_warehouses: int
    latest_run_status: Optional[str]
    latest_run_id: Optional[str]


# ─── Audit ────────────────────────────────────────────────────────────────────

class AuditEventOut(BaseModel):
    id: str
    actor_name: str
    actor_role: str
    action: str
    category: str
    entity_type: str
    entity_id: str
    details: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Error Response ───────────────────────────────────────────────────────────

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Dict[str, Any] = {}


class ErrorResponse(BaseModel):
    error: ErrorDetail
