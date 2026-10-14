"""SQLAlchemy ORM models for all Responso entities."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, CheckConstraint, UniqueConstraint, Index, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(200), nullable=False)
    role = Column(
        SAEnum("LOGISTICS_COORDINATOR", "FIELD_DISPATCHER", "INVENTORY_MANAGER", "SYSTEM_ADMIN", name="user_role"),
        nullable=False,
        default="FIELD_DISPATCHER",
    )
    role_title = Column(String(200), default="")
    department = Column(String(200), default="")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    audit_events = relationship("AuditEvent", back_populates="actor", foreign_keys="AuditEvent.actor_id")
    created_requests = relationship("AssistanceRequest", back_populates="creator")
    allocation_runs = relationship("AllocationRun", back_populates="created_by_user", foreign_keys="AllocationRun.created_by_id")


class Location(Base):
    __tablename__ = "locations"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(300), nullable=False)
    location_type = Column(String(50), default="community")  # community, warehouse, camp
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    district = Column(String(200), default="")
    tehsil = Column(String(200), default="")
    union_council = Column(String(200), default="")
    zone = Column(String(300), default="")
    notes = Column(Text, default="")
    is_simulated = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    requests = relationship("AssistanceRequest", back_populates="location")
    warehouse = relationship("Warehouse", back_populates="location", uselist=False)


class AssistanceRequest(Base):
    __tablename__ = "assistance_requests"

    id = Column(String, primary_key=True, default=gen_uuid)
    reference_code = Column(String(50), unique=True, nullable=False, index=True)
    location_id = Column(String, ForeignKey("locations.id"), nullable=False)
    urgency = Column(
        SAEnum("CRITICAL", "HIGH", "MODERATE", "LOW", name="urgency_level"),
        nullable=False,
        index=True,
    )
    affected_population = Column(Integer, nullable=False, default=0)
    affected_households = Column(Integer, default=0)
    vulnerable_count = Column(Integer, default=0)
    access_status = Column(
        SAEnum("CUT_OFF_ROAD", "BOAT_ONLY", "ACCESSIBLE", name="access_status"),
        default="ACCESSIBLE",
    )
    flood_depth_meters = Column(Float, default=0.0)
    contact_person = Column(String(200), default="")
    contact_phone = Column(String(50), default="")
    status = Column(
        SAEnum("PENDING", "PARTIALLY_ALLOCATED", "ALLOCATED", "DISPATCHED", "FULFILLED", "CLOSED", name="request_status"),
        default="PENDING",
        nullable=False,
        index=True,
    )
    description = Column(Text, default="")
    created_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    location = relationship("Location", back_populates="requests")
    creator = relationship("User", back_populates="created_requests")
    items = relationship("RequestItem", back_populates="request", cascade="all, delete-orphan")
    allocation_lines = relationship("AllocationLine", back_populates="request")
    deliveries = relationship("Delivery", back_populates="request")

    __table_args__ = (
        CheckConstraint("affected_population >= 0", name="chk_affected_population_nonneg"),
    )


class RequestItem(Base):
    __tablename__ = "request_items"

    id = Column(String, primary_key=True, default=gen_uuid)
    request_id = Column(String, ForeignKey("assistance_requests.id", ondelete="CASCADE"), nullable=False)
    item_type = Column(String(50), nullable=False)  # water, food, medical, shelter, hygiene
    quantity_requested = Column(Integer, nullable=False)
    quantity_allocated = Column(Integer, default=0)

    request = relationship("AssistanceRequest", back_populates="items")

    __table_args__ = (
        UniqueConstraint("request_id", "item_type", name="uq_request_item_type"),
        CheckConstraint("quantity_requested > 0", name="chk_qty_requested_positive"),
        CheckConstraint("quantity_allocated >= 0", name="chk_qty_allocated_nonneg"),
    )


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(String, primary_key=True, default=gen_uuid)
    location_id = Column(String, ForeignKey("locations.id"), unique=True, nullable=False)
    name = Column(String(300), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    capacity_kg = Column(Float, default=50000.0)
    available_delivery_trucks = Column(Integer, default=5)
    contact_person = Column(String(200), default="")
    contact_phone = Column(String(50), default="")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    location = relationship("Location", back_populates="warehouse")
    inventory_items = relationship("InventoryItem", back_populates="warehouse", cascade="all, delete-orphan")
    stock_movements = relationship("StockMovement", back_populates="warehouse")
    allocation_lines = relationship("AllocationLine", back_populates="warehouse")
    deliveries = relationship("Delivery", back_populates="warehouse")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(String, primary_key=True, default=gen_uuid)
    warehouse_id = Column(String, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False)
    item_type = Column(String(50), nullable=False)
    quantity_on_hand = Column(Integer, nullable=False, default=0)
    quantity_reserved = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    warehouse = relationship("Warehouse", back_populates="inventory_items")

    __table_args__ = (
        UniqueConstraint("warehouse_id", "item_type", name="uq_warehouse_item_type"),
        CheckConstraint("quantity_on_hand >= 0", name="chk_on_hand_nonneg"),
        CheckConstraint("quantity_reserved >= 0", name="chk_reserved_nonneg"),
        CheckConstraint("quantity_reserved <= quantity_on_hand", name="chk_reserved_le_on_hand"),
    )

    @property
    def quantity_available(self) -> int:
        return max(0, self.quantity_on_hand - self.quantity_reserved)


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(String, primary_key=True, default=gen_uuid)
    warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=False)
    item_type = Column(String(50), nullable=False)
    quantity_delta = Column(Integer, nullable=False)  # positive = inbound, negative = outbound
    balance_after = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    actor_id = Column(String, ForeignKey("users.id"), nullable=True)
    actor_name = Column(String(200), default="")
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)

    warehouse = relationship("Warehouse", back_populates="stock_movements")


class AllocationRun(Base):
    __tablename__ = "allocation_runs"

    id = Column(String, primary_key=True, default=gen_uuid)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    algorithm_version = Column(String(50), default="1.0.0")
    status = Column(
        SAEnum("DRAFT", "APPROVED", "REJECTED", "STALE", name="run_status"),
        default="DRAFT",
        nullable=False,
        index=True,
    )
    is_stale = Column(Boolean, default=False)
    stale_reason = Column(Text, default="")
    summary = Column(Text, default="")
    weights_json = Column(Text, default="{}")  # JSON: urgency/population/waiting/distance weights
    totals_json = Column(Text, default="{}")   # JSON: demand/allocated/unmet totals
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    reviewed_by_name = Column(String(200), default="")
    review_notes = Column(Text, default="")

    created_by_user = relationship("User", back_populates="allocation_runs", foreign_keys=[created_by_id])
    lines = relationship("AllocationLine", back_populates="run", cascade="all, delete-orphan")
    deliveries = relationship("Delivery", back_populates="allocation_run")


class AllocationLine(Base):
    __tablename__ = "allocation_lines"

    id = Column(String, primary_key=True, default=gen_uuid)
    allocation_run_id = Column(String, ForeignKey("allocation_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    request_id = Column(String, ForeignKey("assistance_requests.id"), nullable=False)
    warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=False)
    item_type = Column(String(50), nullable=False)
    quantity_recommended = Column(Integer, nullable=False, default=0)
    quantity_approved = Column(Integer, nullable=True)
    distance_km = Column(Float, default=0.0)
    priority_score = Column(Float, default=0.0)
    explanation = Column(Text, default="")
    factors_json = Column(Text, default="{}")  # JSON: breakdown of priority factors

    run = relationship("AllocationRun", back_populates="lines")
    request = relationship("AssistanceRequest", back_populates="allocation_lines")
    warehouse = relationship("Warehouse", back_populates="allocation_lines")

    __table_args__ = (
        CheckConstraint("quantity_recommended >= 0", name="chk_rec_nonneg"),
    )


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(String, primary_key=True, default=gen_uuid)
    allocation_run_id = Column(String, ForeignKey("allocation_runs.id"), nullable=True)
    request_id = Column(String, ForeignKey("assistance_requests.id"), nullable=False)
    warehouse_id = Column(String, ForeignKey("warehouses.id"), nullable=False)
    status = Column(
        SAEnum("ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "FAILED", name="delivery_status"),
        default="ASSIGNED",
        nullable=False,
        index=True,
    )
    vehicle_code = Column(String(100), default="")
    driver_name = Column(String(200), default="")
    driver_phone = Column(String(50), default="")
    capacity_units = Column(Float, default=0.0)
    distance_km = Column(Float, default=0.0)
    eta_minutes = Column(Integer, default=0)
    dispatch_note = Column(Text, default="")
    failure_reason = Column(Text, default="")
    assigned_to_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    dispatched_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)

    allocation_run = relationship("AllocationRun", back_populates="deliveries")
    request = relationship("AssistanceRequest", back_populates="deliveries")
    warehouse = relationship("Warehouse", back_populates="deliveries")
    items = relationship("DeliveryItem", back_populates="delivery", cascade="all, delete-orphan")
    timeline_events = relationship("DeliveryTimeline", back_populates="delivery", cascade="all, delete-orphan")


class DeliveryItem(Base):
    __tablename__ = "delivery_items"

    id = Column(String, primary_key=True, default=gen_uuid)
    delivery_id = Column(String, ForeignKey("deliveries.id", ondelete="CASCADE"), nullable=False)
    item_type = Column(String(50), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)

    delivery = relationship("Delivery", back_populates="items")

    __table_args__ = (
        CheckConstraint("quantity >= 0", name="chk_delivery_item_qty_nonneg"),
    )


class DeliveryTimeline(Base):
    __tablename__ = "delivery_timeline"

    id = Column(String, primary_key=True, default=gen_uuid)
    delivery_id = Column(String, ForeignKey("deliveries.id", ondelete="CASCADE"), nullable=False)
    event_text = Column(Text, nullable=False)
    status = Column(String(50), nullable=False)
    note = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    delivery = relationship("Delivery", back_populates="timeline_events")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, default=gen_uuid)
    actor_id = Column(String, ForeignKey("users.id"), nullable=True)
    actor_name = Column(String(200), default="")
    actor_role = Column(String(100), default="")
    action = Column(String(100), nullable=False, index=True)
    category = Column(
        SAEnum("ALLOCATION", "INVENTORY", "REQUEST", "DISPATCH", "SECURITY", "SYSTEM", name="audit_category"),
        nullable=False,
        index=True,
    )
    entity_type = Column(String(100), default="")
    entity_id = Column(String(200), default="")
    details = Column(Text, default="")
    # safe_metadata: no secrets, no PII beyond what's already in the system
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)

    actor = relationship("User", back_populates="audit_events", foreign_keys=[actor_id])

    __table_args__ = (
        Index("ix_audit_events_entity", "entity_type", "entity_id"),
    )


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"

    id = Column(String, primary_key=True, default=gen_uuid)
    key = Column(String(255), unique=True, nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    endpoint = Column(String(255), nullable=False)
    status_code = Column(Integer, nullable=False)
    response_body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)

