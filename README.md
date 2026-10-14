# Responso — Disaster Relief Resource Optimizer

<div align="center">

![OpenHack26](https://img.shields.io/badge/OpenHack'26-Category_4:_Climate_%26_Disaster_Resilience-bd00ff?style=for-the-badge&labelColor=0b0b0f)
![Problem ID](https://img.shields.io/badge/Problem_ID-CL--03-9dff00?style=for-the-badge&labelColor=0b0b0f)
![Tests](https://img.shields.io/badge/Tests-34%2F34_Passing_(100%25)-00c853?style=for-the-badge&labelColor=0b0b0f)
![Deployment](https://img.shields.io/badge/Vercel-Deployed-0070f3?style=for-the-badge&logo=vercel&logoColor=white&labelColor=0b0b0f)

<h3>Full-Stack Disaster Relief Coordination, Inventory Tracking & Optimization System</h3>
<p>Engineered for high-stress humanitarian logistics during acute emergency scenarios (e.g., Sindh Floods).</p>

[🌐 Live Frontend (Vercel)](https://responso-disaster-relief-optimizer.vercel.app) · [💻 Local Frontend (Port 3000)](http://localhost:3000) · [⚙️ API Swagger Docs](http://127.0.0.1:8000/docs) · [🩺 Health Check](http://127.0.0.1:8000/health)

</div>

---

## 🧭 Table of Contents

- [1. Executive Overview](#1-executive-overview)
- [2. System Architecture & Tech Stack](#2-system-architecture--tech-stack)
- [3. Localhost & Deployment URLs](#3-localhost--deployment-urls)
- [4. Resource Allocation Algorithm](#4-resource-allocation-algorithm)
- [5. Offline-First Resilience & Sync Engine](#5-offline-first-resilience--sync-engine)
- [6. Directory Structure](#6-directory-structure)
- [7. Quickstart & Installation](#7-quickstart--installation)
- [8. Vercel Deployment Configuration](#8-vercel-deployment-configuration)
- [9. Demo Accounts & Credentials](#9-demo-accounts--credentials)
- [10. Automated Testing Suite](#10-automated-testing-suite)
- [11. Implemented REST APIs](#11-implemented-rest-apis)
- [12. OpenHack'26 Challenge Alignment (CL-03)](#12-openhack26-challenge-alignment-cl-03)
- [13. Security, Governance & Audit](#13-security-governance--audit)

---

## 1. Executive Overview

**Responso** is an integrated disaster relief coordination platform designed to resolve the critical bottleneck of inefficient relief distribution during natural disasters. By linking field assistance requests directly to regional depot stockpiles, Responso runs a deterministic, transparent, and explainable **Resource Allocation Engine** that balances urgency, affected population, logistics distance (via Haversine calculations), and depot delivery capacity.

### Key Capabilities
- **Assistance Request Registry**: Live tracking of field demands categorized by urgency (`critical`, `high`, `moderate`, `low`), affected population, GPS coordinates, and required emergency items (Clean Water, MRE Food Packs, First Aid Kits, Shelter Tents, Hygiene Packs).
- **Depot & Stockpile Management**: Real-time multi-depot inventory visibility (Sukkur Hub, Hyderabad Forward Depot, Karachi Central) with transaction-locked stock movements.
- **Explainable Optimization Engine**: Deterministic greedy heuristic scoring algorithm prioritizing life-safety, minimizing transit distance, and respecting convoy capacity with zero "black-box" magic.
- **Allocation Run Lifecycle**: Draft recommendation preview $\rightarrow$ human-in-the-loop coordinator approval $\rightarrow$ transactional stock decrement $\rightarrow$ automated convoy dispatch creation.
- **Active Convoy Tracking**: State-machine delivery lifecycle (`dispatched` $\rightarrow$ `in_transit` $\rightarrow$ `delivered` $\rightarrow$ `failed` with automatic stock restoration).
- **Offline-First Resilience**: Full field operability when telecommunications collapse; persistent FIFO operation queue with unique UUID idempotency keys.
- **Audit & Governance**: Complete, immutable event logging capturing actors, operational timestamps, and changes.

---

## 2. System Architecture & Tech Stack

### Architecture Pattern
Responso adheres to a clean, modular multi-tier full-stack architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend UI (Vite + React 19)               │
│      Google AI Studio Design System • Tailwind CSS v4       │
│      Lucide Icons • Leaflet Mapping • Interactive Dashboards│
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON (via Vite Proxy)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 FastAPI REST Backend (Python 3.13)          │
│   Pydantic v2 Schemas • JWT Authentication • RBAC Security  │
│   Standardized JSON Error Payloads {"error": {...}}        │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│  Optimization Engine         │ │ SQLAlchemy 2.0 ORM          │
│  - Haversine Distance Calc   │ │ SQLite / WAL Mode           │
│  - Factor-based Prioritization│ │ Full Transactional Locks    │
│  - Nearest Depot Matching    │ │ Relational Integrity & PK/FK│
└──────────────────────────────┘ └─────────────────────────────┘
```

### Technology Matrix
| Layer | Technologies & Libraries |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Leaflet Maps, Service Worker PWA |
| **Backend API** | Python 3.13, FastAPI, Uvicorn, Pydantic v2 |
| **Database & ORM** | SQLite 3 with Write-Ahead Logging (WAL), SQLAlchemy 2.0 ORM (12 relational models) |
| **Authentication & Security** | JWT (HS256 via `pyjwt`), Native `bcrypt` password hashing (cost factor 12), Role-Based Access Control (RBAC) |
| **Testing** | Pytest (29 tests), Node Native Test Runner & TSX (5 tests) — 100% pass rate |
| **Deployment** | Vercel (Frontend SPA with `vercel.json` rewrites and `.npmrc` peer-deps), Uvicorn/Docker (Backend) |

---

## 3. Localhost & Deployment URLs

When running locally or inspecting deployment:

| Service | Target URL | Description |
| :--- | :--- | :--- |
| **Live Frontend (Vercel)** | [https://responso-disaster-relief-optimizer.vercel.app](https://responso-disaster-relief-optimizer.vercel.app) | Production SPA deployment |
| **Local Frontend** | [http://localhost:3000](http://localhost:3000) | Local React 19 + Vite development server |
| **Local Backend API** | [http://127.0.0.1:8000](http://127.0.0.1:8000) | FastAPI async REST API server |
| **Swagger Interactive Docs**| [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | Interactive OpenAPI schema explorer & test client |
| **Health Check Endpoint** | [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) | Backend connectivity heartbeat |

---

## 4. Resource Allocation Algorithm

The Responso Allocation Engine (`backend/app/allocation/engine.py`) implements an explainable, deterministic baseline algorithm designed for humanitarian disaster response:

### 1. Priority Scoring Formula
For each unallocated assistance request $i$:
$$\text{Score}_i = w_{\text{urgency}} \cdot U_i + w_{\text{pop}} \cdot P_i + w_{\text{wait}} \cdot W_i$$

Where:
- **Urgency Factor ($U_i$)**: `critical` = 1.0, `high` = 0.75, `moderate` = 0.50, `low` = 0.25 (Default Weight = $0.50$).
- **Population Factor ($P_i$)**: $\min\left(1.0, \frac{\text{affected\_population}}{10000}\right)$ (Default Weight = $0.35$).
- **Wait Time Factor ($W_i$)**: Hours waiting capped at 72 hours normalized to $[0, 1]$ (Default Weight = $0.15$).

### 2. Distance Calculation (Haversine Formula)
Geographical distance between depot $(\phi_w, \lambda_w)$ and incident site $(\phi_r, \lambda_r)$ is calculated via great-circle distance:
$$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_w)\cos(\phi_r)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
with Earth radius $R = 6,371\text{ km}$.

### 3. Allocation Constraints & Logic
1. Requests are sorted in descending order of Priority Score.
2. Available warehouses are queried and sorted in ascending order of distance $d$.
3. Warehouses provide items from existing stock up to remaining unallocated demand, respecting:
   - **Weight Capacity (`capacity_kg`)**: Based on unit weights (Water: 10kg, Food: 24kg, Medical: 4.5kg, Shelter: 18kg, Hygiene: 3.5kg).
   - **Delivery Fleet Quota (`available_delivery_trucks`)**: Ensures a depot does not commit beyond available transport vehicles.
4. **Draft vs Confirmed**: Running the optimizer creates an uncommitted `draft` allocation run with transparent decision reasons. Inventory is **only** reserved and deducted when an authorized relief coordinator explicitly **approves** the run.

---

## 5. Offline-First Resilience & Sync Engine

To ensure uninterrupted humanitarian operations in disaster zones with degraded or severed telecommunications:

1. **PWA & App Shell Caching (`public/sw.js`, `public/manifest.json`)**:
   - Service worker caches the core HTML, stylesheets, scripts, icons, and Leaflet map assets.
   - Navigation fallback: Serves cached app shell during offline blackouts.
2. **Persistent Local Data Persistence (`src/services/storage.ts`)**:
   - Schema versioning (`v3`) with migration compatibility for legacy stores.
   - Built-in `QuotaExceededError` protection gracefully prunes historical audit logs while protecting active request and convoy records.
3. **Persistent Operation Queue (`src/services/offlineSync.ts`)**:
   - Mutations executed offline (`CREATE_REQUEST`, `UPDATE_DELIVERY_STATUS`, `RECORD_STOCK_MOVEMENT`) are immediately applied to local state with `_syncStatus: 'pending'` and enqueued into `responso_offline_sync_queue_v1`.
   - Every operation is signed with a unique `idempotencyKey` (UUIDv4) to prevent duplicate backend execution upon network replay.
4. **Automatic & Foreground Synchronization**:
   - Heartbeat connectivity monitor pings `/health` and listens to `online` / `offline` events.
   - When connection is restored or the user clicks **Sync Now**, the FIFO queue drains automatically, updating client temporary IDs with official server reference codes (`REQ-0001`).

---

## 6. Directory Structure

```text
Responso/
├── .gitignore                          # Root ignore for node_modules, *.db, .env, venv
├── .npmrc                              # legacy-peer-deps=true for npm install reliability
├── README.md                           # Master documentation
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── allocation.py       # Draft run calculation & atomic approval
│   │   │   │   ├── audit.py            # Audit log inspection
│   │   │   │   ├── auth.py             # User login & JWT token issuance
│   │   │   │   ├── dashboard.py        # Summary metrics & demo reset
│   │   │   │   ├── deliveries.py       # Convoy tracking & status transitions
│   │   │   │   ├── inventory.py        # Stock movement & stock levels
│   │   │   │   ├── locations.py        # Geographic coordinate registry
│   │   │   │   ├── requests.py         # Assistance requests CRUD
│   │   │   │   ├── users.py            # User management
│   │   │   │   └── warehouses.py       # Depot master data
│   │   │   └── deps.py                 # DB session & auth dependencies
│   │   ├── allocation/
│   │   │   └── engine.py               # Deterministic allocation algorithm
│   │   ├── core/
│   │   │   ├── config.py               # Environment configuration
│   │   │   ├── database.py             # SQLAlchemy engine & session factory
│   │   │   └── security.py             # bcrypt hashing & JWT verification
│   │   ├── models/
│   │   │   └── models.py               # 12 relational ORM models
│   │   ├── schemas/
│   │   │   └── schemas.py              # Pydantic v2 request/response schemas
│   │   ├── seeds/
│   │   │   └── seed_data.py            # Sindh Flood disaster scenario seeder
│   │   └── main.py                     # FastAPI application entrypoint
│   ├── tests/
│   │   ├── conftest.py                 # Test fixtures & isolated SQLite database
│   │   ├── test_allocation_engine.py   # 7 unit tests for algorithm & math
│   │   ├── test_api_allocation_flow.py # 6 integration tests for transactions
│   │   ├── test_api_auth_and_requests.py # 9 auth, RBAC & validation tests
│   │   ├── test_enhanced_features.py   # 6 multi-depot, rollback & idempotency tests
│   │   └── test_persistence.py         # 1 persistent restart verification test
│   ├── .env.example
│   ├── requirements.txt
│   └── responso.db                     # Persistent SQLite database
├── responso-_-disaster-relief-resource-optimizer/ # React 19 Frontend
│   ├── .npmrc                          # Frontend legacy-peer-deps config
│   ├── vercel.json                     # Production SPA rewrites
│   ├── src/
│   │   ├── components/                 # LeafletMap, DoodleIcons, SyncQueueModal
│   │   ├── data/mockData.ts            # Seeded Sindh Flood community datasets
│   │   ├── services/
│   │   │   ├── api.ts                  # REST API client with offline fallback
│   │   │   ├── offlineSync.ts          # FIFO sync queue & idempotency engine
│   │   │   ├── optimizer.ts            # Client-side heuristic optimizer mirror
│   │   │   └── storage.ts              # LocalStorage v3 with quota pruning
│   │   ├── views/                      # Dashboard, Requests, Inventory, Allocations, Deliveries, Audit
│   │   ├── App.tsx                     # Main application layout & router
│   │   └── types.ts                    # TypeScript data contracts
│   ├── package.json
│   └── vite.config.ts                  # Configured with /api proxy to backend
└── ReliefRoute_System_Documentation/   # Reference specifications & hackathon guides
```

---

## 7. Quickstart & Installation

### Prerequisites
- **Python 3.10+** (tested on Python 3.13)
- **Node.js 18+** & `npm`

### Step 1: Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment (optional)
python -m venv venv
.\venv\Scripts\activate       # On Windows
source venv/bin/activate      # On Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Seed the persistent database with the Sindh Flood scenario
python -m app.seeds.seed_data

# Run the FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will be live at `http://127.0.0.1:8000` (API Docs: `/docs`).

### Step 2: Frontend Setup
In a second terminal:
```bash
cd responso-_-disaster-relief-resource-optimizer

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
The UI will be accessible at `http://localhost:3000` with the `FastAPI Live` badge.

---

## 8. Vercel Deployment Configuration

When deploying the frontend to [Vercel](https://vercel.com):

1. **Root Directory**: Set to `responso-_-disaster-relief-resource-optimizer` (do not leave as `./`).
2. **Framework Preset**: `Vite`.
3. **Build Command**: `vite build` (or `npm run build`).
4. **Output Directory**: `dist`.
5. **Install Command**: `npm install` (automated with `.npmrc` for clean dependency resolution).
6. **SPA Routing**: Handled automatically via `responso-_-disaster-relief-resource-optimizer/vercel.json`.

---

## 9. Demo Accounts & Credentials

The database is seeded with authentic role-based accounts for testing:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Logistics Coordinator** | `tariq.mansoor@responso.pk` | `Password123!` | Run optimizer, approve/reject allocations, manage requests, assign convoys |
| **Operations Coordinator**| `operations@responso.pk` | `Password123!` | Alternate logistics coordinator account for automated tests & operations |
| **Field Dispatcher** | `zainab.baloch@responso.pk` | `Password123!` | Transition delivery states (dispatched, in transit, delivered, failed) |
| **Inventory Manager** | `imran.qureshi@responso.pk` | `Password123!` | Adjust depot stockpiles, log inbound restock and outbound distributions |
| **System Admin** | `farhan.ali@responso.pk` | `Password123!` | Full governance, role elevation/demotion, account activation/suspension, audit inspection |

---

## 10. Automated Testing Suite

Responso includes **34 automated unit and integration tests** with a **100% pass rate**:

### Backend Pytest Suite (29 Tests)
```bash
python -m pytest backend/tests/ -v
```
**Results**: `29 passed in 10.23s`
- **`test_allocation_engine.py` (7 tests)**: Haversine distance accuracy, population normalization caps, priority score weighting, stock non-exhaustion, multiple competing requests, unmet demand calculation.
- **`test_api_allocation_flow.py` (6 tests)**: Stock movement validation, draft generation, stale run invalidation, atomic approval with row-level locks, delivery state transitions.
- **`test_api_auth_and_requests.py` (9 tests)**: `/health`, login JWT token generation, invalid credentials rejection, 401 on bad tokens, 403 on role mismatch, request validation.
- **`test_enhanced_features.py` (6 tests)**:
  - Multi-warehouse allocation line grouping and per-warehouse deliveries.
  - Safe reservation release and request demand restoration upon delivery failure (`FAILED`).
  - Delivery status idempotent retries preventing double deductions.
  - Role-Based Access Control (RBAC) enforcement across all endpoints.
  - Database-enforced idempotency deduplication with `Idempotency-Key` headers.
  - Concurrency-safe monotonic reference generation (`REQ-XXXX`).
- **`test_persistence.py` (1 test)**: Confirms data survival across full process and database restarts.

### Frontend Test Suite (5 Tests)
```bash
cd responso-_-disaster-relief-resource-optimizer
npm test
```
**Results**: `5 passed in 0.25s`
- User entity mapping, session token storage/cleanup, offline sync queue enqueueing, single/bulk retry error recovery, depot weight and fleet truck constraint enforcement.

---

## 11. Implemented REST APIs

All API endpoints follow RESTful conventions, produce structured JSON, support idempotency headers (`Idempotency-Key`), and return standardized error envelopes (`{"error": {"code": "...", "message": "...", "details": ...}}`):

| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Health check & system status | Public |
| `POST` | `/api/v1/auth/login` | Real credentials authentication & JWT issuance | Public |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | Authenticated |
| `POST` | `/api/v1/auth/logout` | Invalidate/clear active session token | Authenticated |
| `GET` | `/api/v1/dashboard/summary` | Aggregate dashboard statistics & KPIs | Authenticated |
| `POST` | `/api/v1/dashboard/reset-demo` | Reset database to fresh Sindh Flood seed | Admin / Coordinator |
| `GET` | `/api/v1/requests/` | List assistance requests with status filtering | Authenticated |
| `POST` | `/api/v1/requests/` | Register new field assistance request (Idempotent) | Authenticated |
| `GET` | `/api/v1/requests/{id}` | Retrieve request details & required items | Authenticated |
| `PATCH` | `/api/v1/requests/{id}` | Update status or priority | Coordinator / Admin |
| `GET` | `/api/v1/warehouses/` | List storage depots & active capacities | Authenticated |
| `GET` | `/api/v1/warehouses/{id}/inventory` | List item stock for specific depot | Authenticated |
| `GET` | `/api/v1/inventory/` | List item stock across all depots | Authenticated |
| `POST` | `/api/v1/inventory/movements` | Record incoming supplies or manual adjustments (Idempotent) | Inventory / Admin |
| `GET` | `/api/v1/allocation-runs/` | List historical allocation runs | Authenticated |
| `POST` | `/api/v1/allocation-runs/` | Generate deterministic draft allocation run | Coordinator / Admin |
| `GET` | `/api/v1/allocation-runs/{id}` | Inspect recommendation lines & decision reasoning | Authenticated |
| `POST` | `/api/v1/allocation-runs/{id}/approve` | Confirm allocation, create per-warehouse deliveries, reserve stock | Coordinator / Admin |
| `POST` | `/api/v1/allocation-runs/{id}/reject` | Reject draft allocation recommendation | Coordinator / Admin |
| `GET` | `/api/v1/deliveries/` | List active relief convoys with depot & request metadata | Authenticated |
| `POST` | `/api/v1/deliveries/{id}/assign` | Assign convoy vehicle and driver | Coordinator / Admin |
| `PATCH` | `/api/v1/deliveries/{id}/status` | Update convoy status (`DISPATCHED`, `IN_TRANSIT`, `DELIVERED`, `FAILED`) | Coordinator / Dispatcher / Admin |
| `GET` | `/api/v1/users/` | List users | Admin |
| `PATCH` | `/api/v1/users/{id}` | Update user (Self-update safe fields; Admin only for role/active) | Self / Admin |
| `GET` | `/api/v1/audit/events` | Inspect immutable audit event log | Admin |

---

## 12. OpenHack'26 Challenge Alignment (CL-03)

Responso was built for **OpenHack'26** (Department of Software Engineering, MUET SZAB Campus, Khairpur) under **Category 4: Climate & Disaster Resilience — Problem Statement CL-03 (Disaster Relief Resource Optimizer)**:

| Hackathon Requirement | How Responso Solves It |
| :--- | :--- |
| **Real-time Demand vs Supply** | Live multi-item registry (Water, Food, Medical, Shelter, Hygiene) mapped directly to regional warehouse stockpiles. |
| **Priority Scoring** | Mathematical composite score weighting Urgency (50%), Population (35%), and Waiting Hours (15%). |
| **Spatial Logistics** | Haversine distance calculations linking demand sites to closest viable depot. |
| **Resource Constraints** | Respects depot kilogram weight thresholds and truck fleet availability. |
| **Human-in-the-Loop** | Optimization runs produce transparent drafts requiring coordinator approval before stock decrement. |
| **Convoy Tracking** | End-to-end convoy state machine with automated rollback of reservations if delivery fails. |
| **Offline Resilience** | Full PWA offline mode with UUID idempotency queue for severed telecom scenarios. |
| **Auditability** | Immutable audit log capturing all actors, actions, and system transitions. |

---

## 13. Security, Governance & Audit

- **Authentication**: JWT tokens signed with HMAC-SHA256 containing expiration timestamps and user IDs.
- **Password Protection**: Passwords securely hashed with salted native `bcrypt` (work factor 12); no plaintext passwords stored.
- **Role-Based Access Control**: Declarative FastAPI dependency `require_role(...)` guards sensitive endpoints against unauthorized privilege escalation.
- **Database Safety**: Parameterized queries via SQLAlchemy ORM protect against SQL injection. Foreign key constraints and database-level checks ensure referential integrity.
- **Race Condition Prevention**: Allocation approvals employ atomic database transactions (`session.commit()` with row locking) to prevent double-spending inventory.
- **CORS & Environment Isolation**: Configured CORS middleware with allowed origins; all environment secrets managed via `.env`.
