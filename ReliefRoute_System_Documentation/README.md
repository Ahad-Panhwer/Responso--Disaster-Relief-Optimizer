# ReliefRoute — Disaster Relief Resource Optimizer
**Working title:** confirm branding with the team. **Tagline:** Right Supplies. Right Place. Right Time.

ReliefRoute is a full-stack disaster-relief coordination platform for registering community assistance requests, managing warehouse inventory and delivery capacity, generating explainable resource-allocation recommendations, and tracking deliveries.

## Prototype boundary
The hackathon MVP uses simulated requests, stock, locations, distances, and capacity. It is a decision-support prototype, not an official emergency-management system. Recommendations require human review before dispatch. Do not claim simulated routes, risks, or outcomes are official.

## Proposed stack
- Frontend: React + TypeScript + Vite
- Backend: Python + FastAPI + Pydantic
- Database: PostgreSQL + SQLAlchemy + Alembic
- Authentication: hashed passwords, short-lived access tokens, backend role checks
- Testing: Pytest, Vitest/React Testing Library, API integration tests
- Local environment: Docker Compose; Leaflet/OpenStreetMap map with a list fallback

## MVP
1. Login and role-based authorization.
2. Create, view, update, and close assistance requests.
3. Manage warehouses, stock movements, and simple delivery capacity.
4. Transparent request-priority scoring.
5. Deterministic allocation recommendations respecting demand, stock, distance, and capacity.
6. Human approval/rejection before dispatch.
7. Delivery status tracking.
8. Dashboard for requests, inventory, unmet demand, and delivery progress.
9. Audit trail, seed/demo data, validation, error states, and automated tests.

## Suggested repository
```text
reliefroute/
  frontend/src/{app,components,features,pages,lib,types}/
  backend/app/{api,core,models,schemas,services}/
  backend/tests/
  backend/alembic/
  docs/
  scripts/
  .env.example
  .gitignore
  docker-compose.yml
  README.md
```

## Local setup target
1. Install Git, Python 3.11+, Node.js LTS, and Docker Desktop (or PostgreSQL).
2. Copy `.env.example` to `.env`; replace development secrets. Never commit `.env`.
3. Start database with `docker compose up -d db`.
4. Create/activate a Python virtual environment in `backend/`, install pinned requirements.
5. Apply migrations with `alembic upgrade head` from `backend/`.
6. Run the documented seed script.
7. Start API with `uvicorn app.main:app --reload` from `backend/`.
8. Run `npm install` and `npm run dev` from `frontend/`.
9. Verify the frontend, backend `/health`, API docs, and seeded demo workflow.

Only document commands as working after they have been tested against the actual code.

## Allocation principles
Use an explainable deterministic heuristic, not opaque AI. Score requests using urgency, affected population, and waiting time. Allocate only requested item types; never exceed demand, stock, or capacity. Prefer nearer warehouses using an explicitly labelled distance estimate. Record unmet demand and a plain-language explanation. A recommendation does not reserve stock until an authorized user approves it and stock is re-checked transactionally.

## Security and quality checklist
- Password hashes only; no secrets committed.
- Backend enforces roles; frontend-only hiding is not authorization.
- Validate all fields and quantities; use ORM parameterization.
- Restrict CORS, use HTTPS when hosted, and avoid sensitive logs.
- Prevent negative inventory and concurrent over-allocation.
- Audit stock, approval, and delivery changes.
- Use fictional demo data and label estimates/simulated locations.
- Map failure must not block list-based workflows.
- Fresh setup and tests pass; data persists after restart.
- Team can explain the code and disclose AI/tool usage.

## Docs index
See `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API_SPEC.md`, `ALLOCATION_ALGORITHM.md`, `UI_UX.md`, `SECURITY.md`, `TEST_PLAN.md`, `TASKS.md`, `DEPLOYMENT.md`, `AI_USAGE.md`, `DEMO_SCRIPT.md`, and `CANVA_CONTENT.md`.
