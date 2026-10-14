# API Contract
Base path: `/api/v1`; JSON; protected routes use `Authorization: Bearer <token>`; timestamps are ISO 8601 UTC.

## Error codes
- 400 business rule/invalid transition
- 401 missing/invalid/expired auth
- 403 insufficient role
- 404 unknown resource
- 409 conflict, duplicate reference, or stale/insufficient stock
- 422 schema validation
- 500 unexpected error without client-visible stack trace

Standard error:
```json
{"error":{"code":"INSUFFICIENT_STOCK","message":"Stock changed; recalculate allocation.","details":{}}}
```

## Idempotency Support
All mutating endpoints (`POST /api/v1/requests/`, `POST /api/v1/allocation-runs/{id}/approve`, `PATCH /api/v1/deliveries/{id}/status`, `POST /api/v1/inventory/movements`) accept an optional `Idempotency-Key` HTTP header.
- If a request is received with a previously processed idempotency key, the server replays the cached HTTP status code and response payload without repeating inventory, delivery, or request side effects.
- Prevents double-deductions and duplicate deliveries when network dropouts cause client retries.

## Endpoints
- `GET /health` — System and database health status (Public)
- `POST /api/v1/auth/login` — Real credentials validation (`Password123!`) and JWT issuance (Public)
- `GET /api/v1/auth/me` — Current authenticated user profile (Authenticated)
- `POST /api/v1/auth/logout` — Invalidate session token (Authenticated)
- `GET /api/v1/users/` — User accounts listing (Admin only)
- `PATCH /api/v1/users/{id}` — User account update (Safe fields `display_name`, `department`, `role_title` allowed for self-updates; `role` and `is_active` require Admin)
- `GET /api/v1/requests/` — Assistance requests list with status filtering (Authenticated)
- `POST /api/v1/requests/` — Create assistance request (Generates concurrency-safe monotonic `REQ-XXXX` reference code) (Authenticated)
- `GET /api/v1/requests/{id}` — Request details with item breakdown (Authenticated)
- `PATCH /api/v1/requests/{id}` — Update request urgency/status (Coordinator / Admin)
- `GET /api/v1/warehouses/` — Warehouse master list with weight capacity and truck fleet metrics (Authenticated)
- `GET /api/v1/warehouses/{id}/inventory` — Depot inventory breakdown (Authenticated)
- `GET /api/v1/inventory/` — Global inventory view across all depots (Authenticated)
- `POST /api/v1/inventory/movements` — Transactional stock adjustment (Inventory Manager / Admin)
- `GET /api/v1/allocation-runs/` — List allocation runs (Authenticated)
- `POST /api/v1/allocation-runs/` — Compute draft allocation with weight and truck constraints (Coordinator / Admin)
- `GET /api/v1/allocation-runs/{id}` — Get allocation recommendation lines and factors (Authenticated)
- `POST /api/v1/allocation-runs/{id}/approve` — Atomically commit reservations, create distinct deliveries per source warehouse, mark draft stale (Coordinator / Admin)
- `POST /api/v1/allocation-runs/{id}/reject` — Reject draft allocation run (Coordinator / Admin)
- `GET /api/v1/deliveries/` — List deliveries with source depot and destination community metadata (Authenticated)
- `POST /api/v1/deliveries/{id}/assign` — Assign delivery driver and convoy vehicle (Coordinator / Admin)
- `PATCH /api/v1/deliveries/{id}/status` — Status transition (`DISPATCHED`, `IN_TRANSIT`, `DELIVERED`, `FAILED`) (Coordinator / Dispatcher / Admin)
- `GET /api/v1/dashboard/summary` — Aggregate metrics and KPIs (Authenticated)
- `POST /api/v1/dashboard/reset-demo` — Reset database to Sindh Flood scenario (Coordinator / Admin)
- `GET /api/v1/audit/events` — Immutable audit log review (Admin only)

## Contract rules
1. **Source Depot Tracking**: Approved allocation lines are grouped by `(request_id, warehouse_id)`. Each source warehouse generates a distinct delivery convoy record.
2. **Delivery Completion**: Marking a delivery `DELIVERED` permanently deducts on-hand inventory and releases reservations strictly from the supplying warehouse.
3. **Delivery Failure**: Marking a delivery `FAILED` safely releases reserved quantities back to available stock at the supplying warehouse, restores allocated demand on the request items, and rolls back request status to `PARTIALLY_ALLOCATED` or `PENDING`.
4. **Idempotent Retry**: Re-applying the same status to a delivery or retrying with the same `Idempotency-Key` returns HTTP 200 with no duplicate inventory impact.
5. **Safe Reference Generation**: Sequence numbering scans all existing reference codes via regex to guarantee strictly monotonic increments even after deletions or concurrent creations.
