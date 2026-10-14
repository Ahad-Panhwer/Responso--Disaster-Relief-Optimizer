# Task Breakdown
## Phase 0 — Setup
- Create one repo, branch policy, `.gitignore`, `.env.example`, docs.
- Agree on stack/versions; create frontend shell and API health endpoint.
- Commit working baseline.

## Phase 1 — Backend foundation
- FastAPI config/errors/health.
- SQLAlchemy + PostgreSQL + Alembic.
- User model, password hashing, login/current user, role dependency.
- Pytest and auth tests.

## Phase 2 — Data
- Location/request schemas, models and CRUD endpoints.
- Warehouse/inventory and stock movement transaction.
- Seed fictional demo data.
- Tests for validation, roles and stock constraints.

## Phase 3 — Allocation
- Pure scoring function and unit tests.
- Distance helper and fallback.
- Deterministic greedy allocation respecting demand/stock/capacity.
- Persist runs and lines; explanations/unmet demand.
- Approval with stock re-check and transaction.
- Tests for invariants and stale stock.

## Phase 4 — Frontend
- App shell, login, protected routes and API client.
- Dashboard, request management, inventory, allocation review, deliveries.
- Loading/empty/error states; responsive and keyboard review.
- Add doodle details only after workflows work.

## Phase 5 — Integration
- Connect every UI action to real API.
- Verify persistence after restart and real role restrictions.
- End-to-end smoke test; hand-check an allocation scenario.
- Map fallback; fix demo blockers.

## Phase 6 — Submission
- Fresh setup, tests, no secrets, AI disclosure, reset/seed procedure.
- Rehearse demo; verify official submission destination with organizers.
- Commit final state.

## Team ownership
Person A: backend, data, auth, allocation.
Person B: frontend, screens, API integration.
Person C (if available): integration, tests, seed data, docs and demo. Pair on integration; don't leave it until the final hour.

## If behind schedule, cut in this order
Advanced map/routing → localization/CSV → complex charts. Keep persistence, auth/roles, correct allocation, human approval, and delivery status.
