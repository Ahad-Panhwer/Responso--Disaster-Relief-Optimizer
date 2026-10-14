"""
Responso Resource Allocation Engine
====================================
Deterministic, explainable greedy heuristic for allocating disaster relief
supplies. This is NOT a globally optimal solver and MUST NOT be described
as validated humanitarian policy.

Algorithm version: 1.0.0

Priority score formula (weights sum to 1.0):
  urgency_score = {CRITICAL: 100, HIGH: 75, MODERATE: 50, LOW: 25}
    + 10 bonus for CUT_OFF_ROAD or BOAT_ONLY access
  population_score = min(affected_population / POPULATION_CAP, 1) * 100
  waiting_score = min(hours_waiting / WAITING_CAP_HOURS, 1) * 100
  composite = urgency_w * urgency + pop_w * population + wait_w * waiting

Allocation (greedy, in priority order):
  For each request (highest priority first):
    For each item type the request needs:
      Sort warehouses by distance ascending (unknown distance last)
      Allocate min(demand_remaining, stock_available) from each warehouse
      Record shortfall if demand cannot be met
      Never allocate more than demanded or more than available
"""

import math
import json
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple, Set
from dataclasses import dataclass, field

SUPPLY_TYPES = ["water", "food", "medical", "shelter", "hygiene"]

SUPPLY_WEIGHTS: Dict[str, float] = {
    "water": 10.0,
    "food": 24.0,
    "medical": 4.5,
    "shelter": 18.0,
    "hygiene": 3.5,
}

URGENCY_BASE = {
    "CRITICAL": 100,
    "HIGH": 75,
    "MODERATE": 50,
    "LOW": 25,
}

ALGORITHM_VERSION = "1.0.0"

# Caps used in normalisation (documented in UI)
POPULATION_CAP = 2500
WAITING_CAP_HOURS = 20.0


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Straight-line distance in km using Haversine formula.
    NOT road distance; label as estimated straight-line.
    Returns minimum 0.5 km.
    """
    try:
        R = 6371.0
        d_lat = math.radians(lat2 - lat1)
        d_lng = math.radians(lng2 - lng1)
        a = (
            math.sin(d_lat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(d_lng / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
        dist = R * c
        return max(0.5, round(dist, 1))
    except Exception:
        return 999.0  # Unknown distance — sorted last


def waiting_hours(created_at: datetime) -> float:
    """Hours elapsed since request creation; capped at 168 h (7 days)."""
    try:
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        diff = (now - created_at).total_seconds() / 3600.0
        return max(0.5, min(168.0, round(diff, 1)))
    except Exception:
        return 6.0


@dataclass
class WeightConfig:
    urgency_weight: float = 0.55
    population_weight: float = 0.30
    waiting_time_weight: float = 0.15
    distance_weight: float = 0.0  # kept for forward compatibility

    def to_dict(self) -> dict:
        return {
            "urgency_weight": self.urgency_weight,
            "population_weight": self.population_weight,
            "waiting_time_weight": self.waiting_time_weight,
            "distance_weight": self.distance_weight,
        }


@dataclass
class FactorBreakdown:
    urgency_score: float
    population_score: float
    waiting_time_score: float
    composite_score: float

    def to_dict(self) -> dict:
        return {
            "urgency_score": self.urgency_score,
            "population_score": self.population_score,
            "waiting_time_score": self.waiting_time_score,
            "composite_score": self.composite_score,
        }


@dataclass
class WarehouseSnapshot:
    """Mutable snapshot of one warehouse's available stock for a single run."""
    warehouse_id: str
    warehouse_name: str
    lat: Optional[float]
    lng: Optional[float]
    capacity_kg: float = 50000.0
    available_delivery_trucks: int = 5
    available: Dict[str, int] = field(default_factory=dict)  # item_type -> qty
    allocated_weight_kg: float = 0.0
    convoys_used: Set[str] = field(default_factory=set)  # request_ids served from this warehouse


@dataclass
class AllocationLineResult:
    request_id: str
    warehouse_id: str
    item_type: str
    quantity_recommended: int
    distance_km: float
    priority_score: float
    explanation: str
    factors: FactorBreakdown


@dataclass
class RequestResult:
    request_id: str
    reference_code: str
    community_name: str
    district: str
    urgency: str
    affected_population: int
    waiting_hours: float
    priority_score: float
    factors: FactorBreakdown
    lines: List[AllocationLineResult]
    total_recommended: Dict[str, int]
    total_demanded: Dict[str, int]
    unmet: Dict[str, int]
    fulfillment_pct: float
    algorithmic_reasoning: str


@dataclass
class RunResult:
    lines: List[AllocationLineResult]
    totals: Dict[str, any]
    summary: str
    weights: WeightConfig


def compute_priority(
    urgency: str,
    access_status: str,
    affected_population: int,
    created_at: datetime,
    weights: WeightConfig,
) -> Tuple[FactorBreakdown, float]:
    """Return (FactorBreakdown, waiting_hours)."""
    # 1. Urgency score
    urgency_score = float(URGENCY_BASE.get(urgency.upper(), 25))
    if access_status in ("CUT_OFF_ROAD", "BOAT_ONLY"):
        urgency_score = min(100.0, urgency_score + 10.0)

    # 2. Population score
    safe_pop = max(0, affected_population or 0)
    population_score = min(100.0, (safe_pop / POPULATION_CAP) * 100.0)

    # 3. Waiting time score
    w_hours = waiting_hours(created_at)
    waiting_time_score = min(100.0, (w_hours / WAITING_CAP_HOURS) * 100.0)

    # 4. Composite
    total_w = weights.urgency_weight + weights.population_weight + weights.waiting_time_weight
    safe_w = total_w if total_w > 0 else 1.0
    composite = (
        urgency_score * weights.urgency_weight
        + population_score * weights.population_weight
        + waiting_time_score * weights.waiting_time_weight
    ) / safe_w

    factors = FactorBreakdown(
        urgency_score=round(urgency_score, 2),
        population_score=round(population_score, 2),
        waiting_time_score=round(waiting_time_score, 2),
        composite_score=round(composite, 2),
    )
    return factors, w_hours


def run_allocation(
    requests: list,  # List of ORM AssistanceRequest objects
    warehouses: list,  # List of ORM Warehouse objects
    weights: Optional[WeightConfig] = None,
) -> RunResult:
    """
    Core allocation algorithm. Returns RunResult with lines and totals.
    Does NOT modify any database records — caller handles DB writes.

    Guarantees:
    - quantity_recommended <= quantity_demanded (per item, per request)
    - total allocated per warehouse <= available stock snapshot
    - Closed/FULFILLED requests are excluded by default (caller should filter)
    - All math is integer; no floating-point money
    """
    if weights is None:
        weights = WeightConfig()

    # Build mutable stock snapshots (deep copy — never mutate ORM objects here)
    wh_snapshots: Dict[str, WarehouseSnapshot] = {}
    for wh in warehouses:
        if not wh.is_active:
            continue
        cap_kg = getattr(wh, "capacity_kg", 50000.0)
        if cap_kg is None:
            cap_kg = 50000.0
        truck_count = getattr(wh, "available_delivery_trucks", 5)
        if truck_count is None:
            truck_count = 5
        snap = WarehouseSnapshot(
            warehouse_id=wh.id,
            warehouse_name=wh.name,
            lat=wh.location.latitude if wh.location else None,
            lng=wh.location.longitude if wh.location else None,
            capacity_kg=float(cap_kg),
            available_delivery_trucks=int(truck_count),
        )
        for inv in wh.inventory_items:
            snap.available[inv.item_type] = max(0, inv.quantity_on_hand - inv.quantity_reserved)
        wh_snapshots[wh.id] = snap

    active_wh = list(wh_snapshots.values())

    # Score and sort requests
    scored = []
    for req in requests:
        factors, w_hours = compute_priority(
            req.urgency,
            req.access_status,
            req.affected_population,
            req.created_at,
            weights,
        )
        scored.append((req, factors, w_hours))

    # Sort: composite desc, then oldest first (created_at asc), then reference_code
    scored.sort(key=lambda x: (
        -x[1].composite_score,
        x[0].created_at,
        x[0].reference_code,
    ))

    lines: List[AllocationLineResult] = []

    totals: Dict[str, Dict[str, int]] = {
        "demand": {t: 0 for t in SUPPLY_TYPES},
        "allocated": {t: 0 for t in SUPPLY_TYPES},
        "unmet": {t: 0 for t in SUPPLY_TYPES},
    }

    for req, factors, w_hours in scored:
        # Build demand map from request items
        demand_map: Dict[str, int] = {}
        for item in req.items:
            demand_map[item.item_type] = max(0, item.quantity_requested - item.quantity_allocated)

        req_lat = req.location.latitude if req.location else None
        req_lng = req.location.longitude if req.location else None

        for item_type, remaining_demand in demand_map.items():
            totals["demand"][item_type] = totals["demand"].get(item_type, 0) + (
                # Total demand (not just unmet) for totals
                next((i.quantity_requested for i in req.items if i.item_type == item_type), 0)
            )

            if remaining_demand <= 0:
                continue

            # Sort warehouses by distance (unknown → last)
            def dist_to_req(snap: WarehouseSnapshot) -> float:
                if req_lat is None or req_lng is None or snap.lat is None or snap.lng is None:
                    return 9999.0
                return haversine_km(req_lat, req_lng, snap.lat, snap.lng)

            sorted_wh = sorted(active_wh, key=dist_to_req)

            still_needed = remaining_demand
            unit_weight = SUPPLY_WEIGHTS.get(item_type, 1.0)

            for snap in sorted_wh:
                if still_needed <= 0:
                    break
                avail = snap.available.get(item_type, 0)
                if avail <= 0:
                    continue

                # 1. Truck capacity check: each distinct request served requires 1 truck
                if req.id not in snap.convoys_used:
                    if snap.available_delivery_trucks <= 0 or len(snap.convoys_used) >= snap.available_delivery_trucks:
                        continue

                # 2. Weight capacity check: cannot exceed remaining warehouse dispatch payload
                remaining_kg = max(0.0, snap.capacity_kg - snap.allocated_weight_kg)
                max_units_by_weight = int(remaining_kg / unit_weight)
                if max_units_by_weight <= 0:
                    continue

                take = min(avail, still_needed, max_units_by_weight)
                if take <= 0:
                    continue

                snap.available[item_type] -= take
                snap.allocated_weight_kg += take * unit_weight
                snap.convoys_used.add(req.id)
                still_needed -= take

                dist_km = dist_to_req(snap)
                if dist_km >= 9000:
                    dist_km = 0.0
                    dist_label = "distance unknown"
                else:
                    dist_label = f"{dist_km} km estimated straight-line"

                shortfall = remaining_demand - take if still_needed <= 0 else still_needed
                explanation = (
                    f"Allocated {take} of {item_type} from {snap.warehouse_name} "
                    f"({dist_label}). "
                    f"Priority score {factors.composite_score:.1f}/100 "
                    f"[urgency={factors.urgency_score:.0f}, "
                    f"population={factors.population_score:.0f}, "
                    f"waiting={factors.waiting_time_score:.0f}]."
                )
                if take == max_units_by_weight and max_units_by_weight < min(avail, remaining_demand):
                    explanation += f" Allocation capped by warehouse weight capacity ({snap.capacity_kg:,.0f} kg limit)."
                if shortfall > 0:
                    explanation += f" {shortfall} units remain unmet due to limited stock or capacity constraints."

                lines.append(AllocationLineResult(
                    request_id=req.id,
                    warehouse_id=snap.warehouse_id,
                    item_type=item_type,
                    quantity_recommended=take,
                    distance_km=dist_km,
                    priority_score=factors.composite_score,
                    explanation=explanation,
                    factors=factors,
                ))

                totals["allocated"][item_type] = totals["allocated"].get(item_type, 0) + take


            # Record unmet for this item
            actual_allocated = remaining_demand - still_needed
            unmet = remaining_demand - actual_allocated
            if unmet > 0:
                totals["unmet"][item_type] = totals["unmet"].get(item_type, 0) + unmet

    # Build summary text
    total_alloc = sum(totals["allocated"].values())
    total_unmet = sum(totals["unmet"].values())
    summary = (
        f"Allocated {total_alloc:,} supply units across {len(scored)} requests. "
        f"Unmet demand: {total_unmet:,} units."
    )

    return RunResult(lines=lines, totals=totals, summary=summary, weights=weights)
