# Responso — Disaster Relief Resource Optimizer (Project ID: CL-03)

<div align="center">
  <h3>Full-Stack Disaster Relief Coordination, Inventory Tracking & Optimization System</h3>
  <p>Engineered for high-stress humanitarian logistics during acute emergency scenarios (e.g., Sindh Floods).</p>
</div>

---

## 1. Executive Overview

**Responso** is an integrated disaster relief coordination platform designed to resolve the critical bottleneck of inefficient relief distribution during natural disasters. By linking field assistance requests directly to regional depot stockpiles, Responso runs a deterministic, transparent, and explainable **Resource Allocation Engine** that balances urgency, affected population, logistics distance (via Haversine calculations), and depot delivery capacity.

### Key Capabilities
- **Assistance Request Registry**: Live tracking of field demands categorized by urgency (`critical`, `high`, `moderate`, `low`), affected population, GPS coordinates, and required emergency items (Clean Water, MRE Food Packs, First Aid Kits, Shelter Tents).
- **Depot & Stockpile Management**: Real-time multi-depot inventory visibility (Sukkur Hub, Hyderabad Forward Depot, Karachi Central) with transaction-locked stock movements.
- **Explainable Optimization Engine**: Deterministic greedy heuristic scoring algorithm prioritizing life-safety, minimizing transit distance, and respecting convoy capacity with zero "black-box" magic.
- **Allocation Run Lifecycle**: Draft recommendation preview $\rightarrow$ human-in-the-loop coordinator approval $\rightarrow$ transactional stock decrement $\rightarrow$ automated convoy dispatch creation.
- **Active Convoy Tracking**: State-machine delivery lifecycle (`dispatched` $\rightarrow$ `in_transit` $\rightarrow$ `delivered`) with audit trail logging.
- **Audit & Governance**: Complete, immutable event logging capturing actors, operational timestamps, and changes.

---

## 2. Technology Stack & Architecture

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
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Leaflet Maps |
| **Backend API** | Python 3.13, FastAPI, Uvicorn, Pydantic v2 |
| **Database & ORM** | SQLite 3 with Write-Ahead Logging (WAL), SQLAlchemy 2.0 ORM |
| **Authentication & Security** | JWT (HS256 via `pyjwt`), Native `bcrypt` password hashing, Role-Based Access Control (RBAC) |
| **Testing** | Pytest, FastAPI TestClient, Starlette, Requests |

---

## 3. Directory Structure

```text
Responso/
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
│   │   └── test_persistence.py         # 1 persistent restart verification test
│   ├── .env.example
│   ├── requirements.txt
│   └── responso.db                     # Persistent SQLite database
├── responso-_-disaster-relief-resource-optimizer/ # Existing AI Studio Frontend
│   ├── src/
│   │   ├── services/
│   │   │   └── api.ts                  # Backend REST API client
│   │   ├── App.tsx                     # Main React dashboard & view router
│   │   ├── types.ts                    # Frontend interfaces
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts                  # Configured with /api proxy to backend
├── ReliefRoute_System_Documentation/   # Reference specifications & guidelines
└── README.md
```

---

## 4. Resource Allocation Algorithm

The Responso Allocation Engine (`backend/app/allocation/engine.py`) implements an explainable, deterministic baseline algorithm designed for humanitarian disaster response:

### 1. Priority Scoring Formula
For each unallocated assistance request $i$:
$$\text{Score}_i = w_{\text{urgency}} \cdot U_i + w_{\text{pop}} \cdot P_i + w_{\text{wait}} \cdot W_i$$

Where:
- **Urgency Factor ($U_i$)**: `critical` = 1.0, `high` = 0.75, `moderate` = 0.50, `low` = 0.25 (Weight = $0.50$).
- **Population Factor ($P_i$)**: $\min\left(1.0, \frac{\text{affected\_population}}{10000}\right)$ (Weight = $0.35$).
- **Wait Time Factor ($W_i$)**: Hours waiting capped at 72 hours normalized to $[0, 1]$ (Weight = $0.15$).

### 2. Distance Calculation (Haversine Formula)
Geographical distance between depot $(\phi_w, \lambda_w)$ and incident site $(\phi_r, \lambda_r)$ is calculated via the great-circle distance:
$$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_w)\cos(\phi_r)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
with Earth radius $R = 6,371\text{ km}$.

### 3. Allocation Constraints & Logic
1. Requests are sorted in descending order of Priority Score.
2. Available warehouses are queried and sorted in ascending order of distance $d$.
3. Warehouses provide items from existing stock up to remaining unallocated demand, respecting warehouse delivery transport capacity.
4. **Draft vs Confirmed**: Running the optimizer creates an uncommitted `draft` allocation run with transparent decision reasons (e.g., `"Priority 0.925 (critical urgency, 12,000 pop) matched to Sukkur Hub (38.4 km)"`). Inventory is **only** deducted when an authorized relief coordinator explicitly **approves** the run.

---

## 5. Offline-First Architecture & Synchronization Engine

To ensure uninterrupted humanitarian operations in disaster zones with degraded or severed telecommunications, Responso incorporates an **Offline-First Resilience Architecture**:

### A. Core Strategy & Platform Features
1. **PWA & App Shell Caching (`public/sw.js`, `public/manifest.json`)**:
   - Service worker caches the core HTML, stylesheets, scripts, icons, and Leaflet map assets.
   - Navigation fallback: When offline, page reloads serve the cached app shell seamlessly.
2. **Persistent Local Data Persistence (`src/services/storage.ts`)**:
   - Schema versioning (`v3`) with migration compatibility for legacy stores.
   - Built-in `QuotaExceededError` protection: Gracefully prunes historical audit logs while protecting active request and convoy records.
3. **Persistent Operation Queue (`src/services/offlineSync.ts`)**:
   - Mutations executed offline (`CREATE_REQUEST`, `UPDATE_DELIVERY_STATUS`, `RECORD_STOCK_MOVEMENT`) are immediately applied to local state with `_syncStatus: 'pending'` and enqueued into `responso_offline_sync_queue_v1`.
   - Every operation is signed with a unique `idempotencyKey` to prevent duplicate backend execution upon network replay.
4. **Automatic & Foreground Synchronization**:
   - Heartbeat connectivity monitor pings `/health` and listens to `online` / `offline` events.
   - When connection is restored or the user clicks **Sync Now**, the FIFO queue drains automatically, updating client temporary IDs with official server reference codes.

### B. Feature Availability Matrix
| Capability | Offline Status | Operational Behavior |
| :--- | :---: | :--- |
| **View Relief Records & Map** | Fully Offline | Instant access to cached requests, depot stockpiles, convoys, and map pins. |
| **Local Search & Filter** | Fully Offline | Full search by community, district, and urgency level on local dataset. |
| **Register Assistance Request** | Queued Offline | Creates request immediately with temporary ID; queues for automatic server sync. |
| **Advance Convoy Status** | Queued Offline | State transitions (`ASSIGNED` $\rightarrow$ `DISPATCHED` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `DELIVERED`) applied locally; queued for server sync. |
| **Depot Stock Adjustment** | Queued Offline | Local stock balance validated against negative thresholds; queued for server sync. |
| **Heuristic Allocation Run** | Heuristic Offline | Local deterministic optimizer runs preview; indicates server commit needed. |
| **Authoritative Stock Lock** | Online Required | Transactional database commit with row-level locks requires live backend. |

### C. Conflict Resolution Rules
- **Assistance Requests**: Additive conflict resolution. Offline-created records have unique client IDs and are mapped to official server IDs upon sync with zero clobbering.
- **Stock Depletion**: Local optimistic adjustments are validated against backend row locks upon sync; if stock was depleted remotely, the operation is flagged in the queue with explanation.
- **Convoys**: Monotonic progression along the delivery lifecycle state machine.

---

## 6. Quickstart & Installation

### Prerequisites
- **Python 3.10+** (tested on Python 3.13)
- **Node.js 18+** & `npm`

### Step 1: Clone & Configure Backend
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment (optional but recommended)
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from template
copy .env.example .env   # On Windows
# cp .env.example .env   # On Linux/macOS
```

### Step 2: Seed the Database
Seed the persistent database with the Sindh Flood disaster scenario (Sukkur, Hyderabad, Karachi depots; Dadu, Johi, Sehwan, Larkana relief requests; demo users):
```bash
python -m app.seeds.seed_data
```

### Step 3: Run the Backend Server
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will be available at `http://127.0.0.1:8000`.
- Swagger Interactive API Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### Step 4: Run the Frontend Application
In a separate terminal:
```bash
cd responso-_-disaster-relief-resource-optimizer

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
The frontend UI is served at `http://localhost:3000` (or `http://localhost:5173`).
The UI includes a green `FastAPI Live` status indicator badge confirming live communication with the backend.

---

## 7. Demo Accounts & Credentials

The database is seeded with authentic role-based accounts for testing:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Logistics Coordinator** | `tariq.mansoor@responso.pk` | `Password123!` | Run optimizer, approve/reject allocations, manage requests, assign convoys |
| **Operations Coordinator** | `operations@responso.pk` | `Password123!` | Alternate logistics coordinator account for automated tests & operations |
| **Field Dispatcher** | `zainab.baloch@responso.pk` | `Password123!` | Transition delivery states (dispatched, in transit, delivered, failed) |
| **Inventory Manager** | `imran.qureshi@responso.pk` | `Password123!` | Adjust depot stockpiles, log inbound restock and outbound distributions |
| **System Admin** | `farhan.ali@responso.pk` | `Password123!` | Full governance, role elevation/demotion, account activation/suspension, audit inspection |

---

## 8. Automated Testing Suite

Responso includes a comprehensive test suite covering algorithmic correctness, multi-depot allocations, delivery lifecycle, transactional safety, role authorization, idempotency, and data persistence:

### Backend Test Suite (Pytest)
```bash
# Run all 29 backend tests from repository root
python -m pytest backend/tests/ -v
```
**Backend Test Results**: `29 passed in 10.23s` (100% pass rate).
- **`test_allocation_engine.py` (7 tests)**: Verifies Haversine formula distance accuracy, population normalization caps, priority score weighting, stock non-exhaustion, multiple competing requests, and unmet demand tracking.
- **`test_api_allocation_flow.py` (6 tests)**: Verifies stock movement validation, draft generation, stale run invalidation, atomic approval with row-level locks, and delivery state transitions (`dispatched` $\rightarrow$ `in_transit` $\rightarrow$ `delivered`).
- **`test_api_auth_and_requests.py` (9 tests)**: Verifies `/health`, login JWT token generation, invalid credentials rejection, 401 on missing/bad tokens, 403 on role mismatch, and request input validation.
- **`test_enhanced_features.py` (6 tests)**:
  - `test_multi_warehouse_allocation_and_per_warehouse_deliveries`: Multi-warehouse allocation line grouping, source depot tracking, and per-depot stock deduction on delivery.
  - `test_failed_delivery_releases_reservations_and_restores_demand`: Safely releases reservations back to available stock and restores request demand/status on delivery failure.
  - `test_delivery_status_idempotent_retry`: Prevents double-deductions when delivery status updates are retried.
  - `test_authorization_rbac_enforcement`: Authoritative RBAC check on delivery assignment, delivery status changes, and self-update safe fields vs admin-only role updates.
  - `test_idempotent_request_creation_and_stock_movements`: Database-enforced idempotency deduplication with `Idempotency-Key` headers.
  - `test_request_reference_code_concurrency_and_deletion_safety`: Concurrency-safe monotonic reference generation (`REQ-XXXX`) resilient to record deletion.
- **`test_persistence.py` (1 test)**: Confirms data persistence across a full application and database connection restart.

### Frontend Test Suite (Node Native Runner & TSX)
```bash
# Run frontend test suite
cd responso-_-disaster-relief-resource-optimizer
npm test

# Run frontend typecheck and production build
npm run lint
npm run build
```
**Frontend Test Results**: `5 passed in 0.25s` (100% pass rate).
- `mapBackendUser` mapping backend response to frontend account representation.
- Session token storage, validation, and sign-out cleanup.
- Offline sync queue item enqueueing, unique idempotency key generation, and initial pending status.
- Single item retry, item dismissal, and bulk retry error recovery.
- Optimizer algorithm enforcement of warehouse weight capacity (`capacityKg`) and delivery fleet truck availability (`availableDeliveryTrucks`).

---

## 9. Implemented Backend REST APIs

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
| `PATCH` | `/api/v1/deliveries/{id}/status` | Update convoy status (`DISPATCHED`, `IN_TRANSIT`, `DELIVERED`, `FAILED`) (Idempotent) | Coordinator / Dispatcher / Admin |
| `GET` | `/api/v1/users/` | List users | Admin |
| `PATCH` | `/api/v1/users/{id}` | Update user (Self-update safe fields; Admin only for role/active) | Self / Admin |
| `GET` | `/api/v1/audit/events` | Inspect immutable audit event log | Admin |


## 10. Security & Error Handling

- **Authentication**: JWT tokens signed with HMAC-SHA256 containing expiration timestamps and user IDs.
- **Password Protection**: Passwords securely hashed with salted native `bcrypt` (work factor 12); no plaintext passwords stored.
- **Role-Based Access Control**: Declarative FastAPI dependency `require_role(...)` guards sensitive endpoints against unauthorized privilege escalation.
- **Database Safety**: Parameterized queries via SQLAlchemy ORM protect against SQL injection. Foreign key constraints and database-level checks ensure referential integrity.
- **Race Condition Prevention**: Allocation approvals employ atomic database transactions (`session.commit()` with row locking) to prevent double-spending inventory.
- **CORS & Environment Isolation**: Configured CORS middleware with allowed origins; all environment secrets managed via `.env`.


## 11. Troubleshooting

- **Backend fails to start (`ModuleNotFoundError`)**: Ensure dependencies are installed (`pip install -r backend/requirements.txt`) and run from the backend directory or with `python -m uvicorn app.main:app`.
- **Database connection error**: Verify that `backend/responso.db` has write permissions. If needed, re-run `python -m app.seeds.seed_data`.
- **Frontend shows "Offline Mode (Simulated Data)"**: Verify the backend is running on `http://127.0.0.1:8000`. Check that the Vite proxy in `vite.config.ts` points to the correct backend port.
- **Password hashing warning on Python 3.13**: Responso uses native `bcrypt` directly rather than deprecated passlib wrappers, ensuring clean execution on Python 3.13+.
