# Deployment Guide
## Local prerequisites
Git, Python 3.11+, Node.js LTS, Docker Compose or local PostgreSQL.

## Local sequence
1. Clone repository.
2. Copy `.env.example` to `.env` and replace secrets.
3. Start database with `docker compose up -d db`.
4. Create/activate virtual environment in `backend/`; install pinned dependencies.
5. Apply Alembic migrations.
6. Run the seed script.
7. Start API using Uvicorn.
8. Install frontend packages and run Vite.
9. Check frontend, API `/health`, API docs, and demo workflow.
Commands must be confirmed against actual scripts before final README publication.

## Hosted checklist
HTTPS, correct frontend API URL, private database access, strong host-managed secrets, strict CORS, controlled migrations, demo credentials disabled/rotated, debug off, safe logs, backup/export, health check and fictional seed data.

## Recovery
Keep a known-good commit; test local demo reset; use a list/table if map tiles fail; use tested local build if hosting fails and event rules permit. Do not claim production readiness.
