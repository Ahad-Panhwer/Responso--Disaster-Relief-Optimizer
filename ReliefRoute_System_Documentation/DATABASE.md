# Database Design
Use PostgreSQL, SQLAlchemy and Alembic migrations. Use UUID primary keys and UTC timestamps.

## Tables
- **users:** id, email (unique/normalized), password_hash, display_name, role, is_active, created_at, updated_at.
- **locations:** id, name, location_type, latitude, longitude, notes, is_simulated, timestamps.
- **assistance_requests:** id, reference_code (unique), location_id, urgency, affected_population, status, created_by, description, created_at, updated_at, closed_at.
- **request_items:** id, request_id, item_type, quantity_requested; unique request + item type.
- **warehouses:** id, location_id (unique), name, is_active, timestamps.
- **inventory_items:** id, warehouse_id, item_type, quantity_on_hand, quantity_reserved, updated_at; unique warehouse + item; reserved <= on-hand.
- **stock_movements:** id, warehouse_id, item_type, quantity_delta, reason, actor_id, created_at.
- **allocation_runs:** id, created_by, algorithm_version, input_snapshot_hash, status (draft/approved/rejected/stale), summary, created_at, reviewed_at, reviewed_by.
- **allocation_lines:** id, allocation_run_id, request_id, warehouse_id, item_type, quantity_recommended, quantity_approved, distance_km, priority_score, explanation.
- **deliveries:** id, allocation_run_id, request_id, warehouse_id, status, capacity_units, assigned_to, dispatch_note, created_at, updated_at, delivered_at.
- **delivery_items:** id, delivery_id, item_type, quantity.
- **audit_events:** id, actor_id, action, entity_type, entity_id, safe metadata, created_at.

## Relationships and constraints
Requests have many request items; warehouses have inventory and stock movements; allocation runs have allocation lines; deliveries have delivery items. Enforce foreign keys, unique constraints, nonnegative stock, positive requested quantities, and bounded quantities at database and service layers. Add indexes for status/urgency, created_at, warehouse/item, allocation run and delivery status.

## Integrity
Stock changes and approvals use transactions. A stock movement includes actor, reason and timestamp. Prefer closing records over hard deletion to preserve audit history. Never store plaintext passwords, access tokens or unnecessary personal data.
