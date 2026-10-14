# Test Plan
## Layers
1. Unit tests: score, distance, allocation invariants, validation, state transitions.
2. Service tests: requests, stock movements, allocation, approval and delivery.
3. API integration: auth, roles, schema errors, status codes and persistence.
4. Frontend tests: forms, loading/error states, filters and role-gated controls.
5. End-to-end smoke test: sign in → create request → adjust stock → allocate → approve → update delivery → verify dashboard.
6. Manual usability: keyboard, responsive layout, explanations and map fallback.

## Critical cases
- Missing/expired token returns 401; forbidden role returns 403.
- Zero/negative quantity and invalid coordinates rejected.
- Stock adjustment cannot make available stock negative.
- Concurrent approvals cannot spend the same stock twice.
- Allocation never exceeds demand, stock or capacity.
- Unmet = requested - allocated.
- Critical request ranks appropriately when other factors are comparable.
- Distance affects warehouse selection as documented.
- Same snapshot/version gives deterministic output.
- Re-run after stock reduction updates recommendations.
- Empty requests/stock produces a useful empty result.
- Run creation does not consume stock; approval is atomic.
- Stale runs cannot silently approve.
- Invalid delivery transitions rejected; failed delivery requires reason.
- API failure never creates a success toast; refresh reflects database state.
- Map outage leaves list workflow functional.

## Demo acceptance journey
Sign in → show three fictional requests and two warehouses → run allocation → explain priority/distance → approve → progress a delivery → change stock or add critical request → re-run and show unmet demand → refresh and verify persistence → explain limitations.

## Exit criteria
Critical allocation/auth tests pass, no known over-allocation bug, no demo-blocking error, setup is reproducible, and known limitations are documented.
