# Architecture
Use a **modular monolith**, not microservices: React frontend, FastAPI REST API, PostgreSQL database.

```text
Browser: React + TypeScript
  └── JSON REST API
       └── FastAPI
           ├── auth / role checks
           ├── request + location service
           ├── inventory service
           ├── allocation service
           ├── approval + delivery service
           ├── dashboard + audit service
           └── SQLAlchemy ORM
                └── PostgreSQL
```

## Backend folders
- `api/`: routes, HTTP status codes, dependencies
- `schemas/`: Pydantic input/output validation
- `models/`: SQLAlchemy entities
- `services/`: business rules and transactions
- `core/`: settings, password hashing, tokens, logging
- `tests/`: unit and integration tests

## Frontend folders
- `app/`: router and application shell
- `pages/`: dashboard, requests, inventory, allocation, deliveries, admin
- `features/`: feature forms, tables, hooks and types
- `components/`: reusable UI, dialogs, status indicators
- `lib/api.ts`: centralized API client

## Important data flow
Validate on frontend for usability, then validate authentication, role, schema and business rules on backend. Perform database writes in transactions. Display success only after API success. Never use browser local storage as the source of truth for stock or requests.

## Allocation transaction
A run reads a consistent snapshot and stores a draft recommendation; generating a run must not consume stock. Approval re-checks and reserves/commits stock atomically. If stock/capacity changed, return a conflict and require recalculation or explicit review. Record reviewer and audit event.

## Failure handling
Database unavailable → show recoverable error; invalid token → 401; insufficient role → 403; stale run → prevent silent approval; map outage → list/table fallback; empty data → useful empty state.
