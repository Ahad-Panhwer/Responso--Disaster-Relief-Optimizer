# Allocation Algorithm
## Goal
A deterministic, explainable heuristic that proposes feasible allocations. It is not guaranteed to be globally optimal and must not be described as validated humanitarian policy.

## Priority score (initial tunable assumptions)
Urgency base: critical=4, high=3, medium=2, low=1.
- `population_factor = min(affected_population / population_cap, 1)`
- `waiting_factor = min(hours_waiting / waiting_cap_hours, 1)`
- `score = 0.55*(urgency_value/4) + 0.30*population_factor + 0.15*waiting_factor`

Document caps/weights in the UI. Sort by score descending, then oldest request first, then stable reference code.

## Warehouse Constraints
1. **Weight Capacity (`capacity_kg`)**:
   - Each supply type has a defined unit weight (kg):
     - Water: 10.0 kg (jerry can)
     - Food: 24.0 kg (ration pack)
     - Medical: 4.5 kg (clinic kit)
     - Shelter: 18.0 kg (family tent)
     - Hygiene: 3.5 kg (sanitation pack)
   - A warehouse will not allocate quantities that cause its total dispatched cargo weight to exceed `capacity_kg`.
2. **Delivery Truck Availability (`available_delivery_trucks`)**:
   - Each distinct assistance request served by a warehouse requires one dedicated delivery truck from that warehouse's active fleet.
   - When a warehouse's assigned requests reach its `available_delivery_trucks`, that warehouse cannot take on additional requests.

## Allocation
For each request in priority order and each item:
1. Calculate unmet quantity.
2. Find active warehouses with available stock for that item.
3. Sort warehouses by straight-line Haversine distance ascending; unknown distances come last.
4. For each warehouse:
   - Check if the warehouse has available trucks (or already committed a truck to this request).
   - Check remaining weight capacity (`capacity_kg - allocated_weight_kg`).
   - Allocate `min(demand_remaining, available_stock, floor(remaining_weight / unit_weight))`.
5. Continue until demand is met or no feasible stock/capacity/truck remains.
6. Record recommendation line, source warehouse, unmet amount, and constraint explanation.

Multi-Warehouse Grouping:
- If a request's demand is supplied by multiple depots, lines are grouped by `(request_id, warehouse_id)`.
- Upon coordinator approval, each source warehouse generates a distinct delivery convoy record with that depot's vehicle code and driver.

## Distance
Use Haversine distance for simulated coordinates or a seeded distance matrix. Straight-line distance is not road distance or ETA; label it accordingly.

## Human approval and concurrency
Run = draft only; no stock decrement. On approval, re-check stock/capacity and reserve/commit atomically. If stale, reject approval and ask for recalculation. Store algorithm version and snapshot timestamp.

## Explainability examples
- Critical urgency and a high affected population increased priority.
- Allocated 80 of 120 water units because only 80 were available.
- Nearest eligible warehouse selected using estimated straight-line distance.
- 40 units remain unmet; add stock or revise the plan.

## Invariants
Allocated >= 0; allocated <= demand; total allocation <= stock snapshot; capacity use <= capacity; unmet = demand - allocated; same input/version gives same result; closed/cancelled requests excluded by default; no automatic dispatch.
