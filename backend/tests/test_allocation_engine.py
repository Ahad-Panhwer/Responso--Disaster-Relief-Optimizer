"""
Unit Tests for Responso Resource Allocation Engine (engine.py)
==============================================================
"""

import pytest
from datetime import datetime, timezone, timedelta
from types import SimpleNamespace
from app.allocation.engine import (
    haversine_km, waiting_hours, WeightConfig,
    compute_priority, run_allocation
)


def test_haversine_known_coordinates():
    # Sukkur (27.7052, 68.8574) to Dadu (26.7329, 67.7769) is roughly 150-160 km
    dist = haversine_km(27.7052, 68.8574, 26.7329, 67.7769)
    assert 140.0 < dist < 170.0


def test_haversine_same_point_returns_minimum_cap():
    dist = haversine_km(27.7052, 68.8574, 27.7052, 68.8574)
    assert dist == 0.5  # Cap defined in engine


def test_haversine_invalid_coordinates_fallback():
    dist = haversine_km(None, None, 25.0, 68.0)
    assert dist == 999.0


def test_waiting_hours_calculation():
    now = datetime.now(timezone.utc)
    created_at = now - timedelta(hours=5)
    hours = waiting_hours(created_at)
    assert 4.8 <= hours <= 5.2

    hours_fresh = waiting_hours(now)
    assert hours_fresh >= 0.5

    old_time = now - timedelta(days=10)
    assert waiting_hours(old_time) == 168.0


def test_priority_score_urgency_hierarchy():
    now = datetime.now(timezone.utc)
    w = WeightConfig(urgency_weight=0.55, population_weight=0.30, waiting_time_weight=0.15)

    f_crit, _ = compute_priority("CRITICAL", "ACCESSIBLE", 1000, now, w)
    f_high, _ = compute_priority("HIGH", "ACCESSIBLE", 1000, now, w)
    f_mod, _ = compute_priority("MODERATE", "ACCESSIBLE", 1000, now, w)
    f_low, _ = compute_priority("LOW", "ACCESSIBLE", 1000, now, w)

    assert f_crit.composite_score > f_high.composite_score
    assert f_high.composite_score > f_mod.composite_score
    assert f_mod.composite_score > f_low.composite_score


def test_priority_score_cut_off_road_bonus():
    now = datetime.now(timezone.utc)
    w = WeightConfig(urgency_weight=0.55, population_weight=0.30, waiting_time_weight=0.15)

    f_acc, _ = compute_priority("HIGH", "ACCESSIBLE", 1000, now, w)
    f_cut, _ = compute_priority("HIGH", "CUT_OFF_ROAD", 1000, now, w)

    assert f_cut.urgency_score == f_acc.urgency_score + 10.0
    assert f_cut.composite_score > f_acc.composite_score


def test_allocation_respects_available_stock():
    now = datetime.now(timezone.utc)

    # 1 Request needing 5000 units of water
    req = SimpleNamespace(
        id="R1",
        reference_code="REQ-001",
        urgency="CRITICAL",
        access_status="ACCESSIBLE",
        affected_population=1500,
        created_at=now,
        location=SimpleNamespace(name="Dadu Test Camp", district="Dadu", latitude=26.73, longitude=67.77),
        items=[SimpleNamespace(item_type="water", quantity_requested=5000, quantity_allocated=0)],
    )

    # Warehouse with only 2000 available water (3000 on hand, 1000 reserved)
    wh = SimpleNamespace(
        id="W1",
        code="WH-SUKKUR",
        name="Sukkur Hub",
        is_active=True,
        location=SimpleNamespace(latitude=27.70, longitude=68.85),
        inventory_items=[SimpleNamespace(item_type="water", quantity_on_hand=3000, quantity_reserved=1000)],
    )

    result = run_allocation([req], [wh], WeightConfig())

    assert len(result.lines) == 1
    line = result.lines[0]
    assert line.quantity_recommended == 2000
    assert result.totals["allocated"]["water"] == 2000
    assert result.totals["unmet"]["water"] == 3000


def test_allocation_closest_warehouse_first():
    now = datetime.now(timezone.utc)

    # Request near Karachi needing 1000 water
    req = SimpleNamespace(
        id="R1",
        reference_code="REQ-001",
        urgency="CRITICAL",
        access_status="ACCESSIBLE",
        affected_population=1000,
        created_at=now,
        location=SimpleNamespace(name="Thatta Camp", district="Thatta", latitude=24.75, longitude=67.92),
        items=[SimpleNamespace(item_type="water", quantity_requested=1000, quantity_allocated=0)],
    )

    # Far warehouse (Sukkur, ~300km)
    wh_far = SimpleNamespace(
        id="W-FAR",
        code="WH-SUKKUR",
        name="Sukkur Hub",
        is_active=True,
        location=SimpleNamespace(latitude=27.70, longitude=68.85),
        inventory_items=[SimpleNamespace(item_type="water", quantity_on_hand=50000, quantity_reserved=0)],
    )

    # Near warehouse (Karachi, ~70km)
    wh_near = SimpleNamespace(
        id="W-NEAR",
        code="WH-KARACHI",
        name="Karachi Base",
        is_active=True,
        location=SimpleNamespace(latitude=24.89, longitude=67.18),
        inventory_items=[SimpleNamespace(item_type="water", quantity_on_hand=50000, quantity_reserved=0)],
    )

    result = run_allocation([req], [wh_far, wh_near], WeightConfig())

    assert len(result.lines) == 1
    line = result.lines[0]
    assert line.warehouse_id == "W-NEAR"
    assert line.quantity_recommended == 1000
