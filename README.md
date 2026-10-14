# 🚨 Responso — Disaster Relief Resource Optimizer

<div align="center">

![OpenHack'26](https://img.shields.io/badge/OpenHack'26-Climate%20%26%20Disaster%20Resilience-bd00ff?style=for-the-badge&labelColor=0b0b0f)
![Problem ID](https://img.shields.io/badge/Problem-CL--03-9dff00?style=for-the-badge&labelColor=0b0b0f)
![Test Status](https://img.shields.io/badge/Tests-34%2F34%20Passing-00c853?style=for-the-badge&labelColor=0b0b0f)
![Deployment](https://img.shields.io/badge/Frontend-Vercel%20Deployed-0070f3?style=for-the-badge&logo=vercel&logoColor=white&labelColor=0b0b0f)

### Smart Relief. Faster Decisions. Better Coordination.

**A full-stack disaster relief coordination and resource optimization system built to help humanitarian teams manage emergency requests, track supplies, and coordinate deliveries during natural disasters.**

Designed around disaster scenarios such as floods in Sindh, Pakistan, Responso connects field assistance requests with available relief resources through transparent, constraint-aware allocation.

**🌐 Online Mode | 📡 Offline Mode | 🧠 Smart Allocation | 🚚 Delivery Tracking**

[🌐 Live Application](https://responso-disaster-relief-optimizer.vercel.app) · [📘 API Documentation](http://127.0.0.1:8000/docs) · [🩺 Backend Health Check](http://127.0.0.1:8000/health)

**Developed by Team INNOHIVE**  
Abdul Ahad · Devraj · Azhar

</div>

---

## 📑 Table of Contents

- [1. Overview](#-1-overview)
- [2. Online and Offline Modes](#-2-online-and-offline-modes)
- [3. Key Features](#-3-key-features)
- [4. System Architecture](#-4-system-architecture)
- [5. Technology Stack](#-5-technology-stack)
- [6. Resource Allocation Algorithm](#-6-resource-allocation-algorithm)
- [7. Offline Synchronization Engine](#-7-offline-synchronization-engine)
- [8. Application URLs](#-8-application-urls)
- [9. Project Structure](#-9-project-structure)
- [10. Installation and Setup](#-10-installation-and-setup)
- [11. Deployment](#-11-deployment)
- [12. Demo Accounts](#-12-demo-accounts)
- [13. Automated Testing](#-13-automated-testing)
- [14. REST API Endpoints](#-14-rest-api-endpoints)
- [15. OpenHack'26 Challenge Alignment](#-15-openhack26-challenge-alignment)
- [16. Security and Data Integrity](#-16-security-and-data-integrity)
- [17. Team INNOHIVE](#-17-team-innohive)

---

## 🌍 1. Overview

**Responso** is a disaster relief resource optimization platform designed to improve the coordination of emergency supplies during floods and other natural disasters.

During emergencies, relief organizations must manage incoming assistance requests, monitor available supplies, identify urgent needs, and coordinate deliveries across multiple locations. Poor coordination can delay essential supplies from reaching affected communities.

Responso addresses these challenges through a centralized platform that combines inventory management, geographical distance calculations, priority scoring, allocation recommendations, and delivery tracking.

### 🎯 Our Mission

To help humanitarian teams make **faster, more transparent, and better-informed resource allocation decisions**, even when internet connectivity is unreliable or unavailable.

### 💡 How Responso Works

1. **Register requests:** Record affected locations, urgency levels, population estimates, and required relief items.
2. **Monitor resources:** Track available supplies across multiple relief depots.
3. **Optimize allocation:** Calculate priority scores and evaluate suitable depots based on distance, stock, and delivery capacity.
4. **Review recommendations:** Allow authorized coordinators to approve or reject proposed allocations.
5. **Coordinate deliveries:** Track relief convoys from dispatch to final delivery.
6. **Synchronize operations:** Preserve supported field actions offline and synchronize queued changes when connectivity returns.

---

## 🔥 2. Online and Offline Modes

One of Responso's key capabilities is its support for **both ONLINE and OFFLINE operating modes**. Disaster-affected areas may experience network congestion, power outages, or complete communication failures. The application is designed to remain useful in these conditions.

### 🟢 ONLINE MODE — Connected Operations

When an internet connection and the backend service are available, Responso can communicate with its REST API for connected operations.

- Authenticate users and apply role-based permissions.
- Retrieve assistance requests and inventory data from the backend.
- Register and manage relief requests.
- Generate resource allocation recommendations.
- Approve allocations and manage stock movements.
- Track delivery status and review audit records.
- Synchronize queued offline operations with the server.

**Best for:** Relief coordination centers, warehouses, logistics teams, and connected field operations.

### 🟠 OFFLINE MODE — Continue Field Operations

When connectivity is unavailable, Responso uses its Progressive Web App (PWA) capabilities and local storage to support configured offline workflows.

- Load the cached application shell.
- Access data already available in local storage.
- Record supported operations locally.
- Queue eligible changes for later synchronization.
- Preserve queued operations using unique idempotency keys.
- Retry synchronization when connectivity returns.
- Review pending synchronization status.

**Best for:** Flood-affected areas, remote communities, field teams, and locations with unstable internet connectivity.

### 🔄 Automatic Synchronization

When connectivity returns, the synchronization engine can replay eligible queued operations in first-in, first-out (FIFO) order. Idempotency keys help prevent the same operation from being applied more than once.

```text
       ONLINE MODE
            |
     Internet Available?
        /          \
      YES           NO
       |             |
   Server API    OFFLINE MODE
       |             |
   Process Data  Save Supported
       |         Changes Locally
       |             |
       |        Queue Operations
       |             |
       +------ Internet Restored
                     |
               Sync Pending Queue
                     |
               Updated Server Data
```

> **Important:** Offline functionality depends on previously cached application assets, locally available data, and the specific actions implemented for offline use. Server-dependent features may require reconnection. Synchronization should not be interpreted as guaranteed conflict-free merging of every change.

---

## ✨ 3. Key Features

| Feature | Description |
|---|---|
| 🚨 Emergency Request Management | Register and prioritize relief requests based on urgency and affected population. |
| 📦 Multi-Depot Inventory | Track essential supplies across multiple relief warehouses. |
| 🧠 Resource Optimization | Generate explainable allocation recommendations using priority scores and geographical distance. |
| 🗺️ Location-Based Logistics | Use GPS coordinates and Haversine distance calculations to evaluate nearby depots. |
| 🚚 Delivery & Convoy Tracking | Track deliveries through dispatch, transit, delivery, and failure states. |
| 🔄 Online/Offline Operation | Support connected workflows and configured offline field operations. |
| 🔁 Offline Synchronization | Queue eligible local changes and retry synchronization after reconnection. |
| 🔐 Role-Based Access Control | Restrict sensitive operations according to user roles. |
| 📋 Audit Logging | Record operational events for accountability and review. |
| 🧪 Automated Testing | Validate allocation logic, authentication, persistence, and other implemented workflows. |

### Essential Relief Resources

The system manages five categories of emergency supplies:

- 💧 Clean Water
- 🍱 Emergency Food Packs
- 🩹 First Aid Kits
- ⛺ Shelter Tents
- 🧼 Hygiene Packs

---

## 🏗️ 4. System Architecture

Responso follows a modular, multi-tier architecture that separates the frontend, API layer, allocation logic, and database operations.

```text
┌──────────────────────────────────────────────┐
│            React Frontend / PWA              │
│                                              │
│  Dashboard • Requests • Inventory • Maps     │
│  Deliveries • Audit • Local Storage          │
└──────────────────────┬───────────────────────┘
                       │
             HTTP / JSON REST API
                       │
┌──────────────────────▼───────────────────────┐
│              FastAPI Backend                 │
│                                              │
│  Authentication • Validation • API Routes    │
│  Role-Based Access Control • Audit Events    │
└─────────────┬─────────────────┬──────────────┘
              │                 │
┌─────────────▼────────┐ ┌──────▼──────────────┐
│ Resource Allocation  │ │ Database Layer      │
│                      │ │                     │
│ Priority Scoring     │ │ SQLAlchemy ORM      │
│ Distance Calculation │ │ SQLite / WAL        │
│ Stock & Fleet Limits │ │ Relational Models   │
└──────────────────────┘ └─────────────────────┘

        Offline-First Support
     ┌──────────────────────────┐
     │ PWA Cache • Local Storage │
     │ Operation Queue • Sync    │
     └──────────────────────────┘
```

### Architecture Highlights

- Modular API routes for individual system functions.
- A dedicated allocation engine for relief distribution recommendations.
- Transaction-aware inventory operations.
- Local persistence and an offline synchronization queue.
- A separate frontend and backend that communicate through REST APIs.

---

## 🛠️ 5. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| UI & Styling | Tailwind CSS v4, Lucide React |
| Mapping | Leaflet |
| Offline Support | Progressive Web App, Service Worker, Local Storage |
| Backend | Python, FastAPI, Uvicorn |
| Validation | Pydantic v2 |
| Database | SQLite 3, Write-Ahead Logging |
| ORM | SQLAlchemy 2.0 |
| Authentication | JWT, bcrypt |
| Authorization | Role-Based Access Control |
| Testing | Pytest, Node.js Test Runner, TSX |
| Frontend Deployment | Vercel |

---

## 🧠 6. Resource Allocation Algorithm

The allocation engine, implemented in `backend/app/allocation/engine.py`, generates explainable recommendations for distributing available relief resources.

### 6.1 Priority Scoring

Each unallocated assistance request receives a priority score:

\[
S_i = 0.50U_i + 0.35P_i + 0.15W_i
\]

Where:

- **Urgency (\(U_i\)):** Critical = 1.00, High = 0.75, Moderate = 0.50, Low = 0.25.
- **Population (\(P_i\)):** A normalized score based on the affected population, capped at 1.00.
- **Waiting Time (\(W_i\)):** Waiting hours normalized over a maximum of 72 hours.

The default weights emphasize urgency while also considering the number of affected people and how long they have been waiting.

### 6.2 Geographical Distance

Responso uses the Haversine formula to estimate the great-circle distance between a relief depot and an affected location.

\[
\begin{aligned}
a={}&\sin^2\left(\frac{\Delta\phi}{2}\right)\\
&+\cos(\phi_1)\cos(\phi_2)
\sin^2\left(\frac{\Delta\lambda}{2}\right)
\end{aligned}
\]

\[
d=2R\arcsin(\sqrt{a})
\]

Where \(R=6{,}371\) km is the approximate radius of Earth.

### 6.3 Allocation Constraints

The allocation engine considers:

1. Request priority scores.
2. Distance to available relief depots.
3. Available stock for each required item.
4. Depot weight capacity.
5. Available delivery vehicles.
6. Remaining demand after allocations.

### 6.4 Human Approval

The system separates recommendation generation from allocation approval.

```text
Assistance Requests
        ↓
Priority & Distance Evaluation
        ↓
Draft Allocation Run
        ↓
Coordinator Review
        ↓
Approve or Reject
        ↓
Inventory & Delivery Updates
```

Inventory changes are made through the configured approval workflow rather than simply because an optimization run has been generated.

---

## 📡 7. Offline Synchronization Engine

The offline synchronization system is designed to maintain supported field operations when a connection to the backend is unavailable.

### Main Components

**Service Worker — `public/sw.js`**

Caches configured application resources and provides an application-shell fallback when offline.

**Local Storage — `src/services/storage.ts`**

Maintains locally stored application data and handles configured storage migrations and quota protection.

**Synchronization Queue — `src/services/offlineSync.ts`**

Queues eligible operations, including supported request creation, delivery status updates, and stock movement records.

**API Client — `src/services/api.ts`**

Connects frontend services to the backend and supports the application's configured offline fallback behavior.

### Synchronization Flow

1. A supported operation is initiated while offline.
2. The operation is recorded in local application state.
3. A pending operation is added to the synchronization queue.
4. The operation receives a unique UUID-based idempotency key.
5. Connectivity monitoring detects when synchronization can resume.
6. The queue retries eligible operations in FIFO order.
7. The frontend updates the synchronization status using the response.

The synchronization queue is intended to reduce duplicate submissions and help preserve field updates during connectivity interruptions. Final consistency still depends on server validation and conflict-handling behavior.

---

## 🔗 8. Application URLs

| Service | URL | Purpose |
|---|---|---|
| Live Frontend | [Open Responso](https://responso-disaster-relief-optimizer.vercel.app) | Deployed frontend |
| Local Frontend | `http://localhost:3000` | Local development interface |
| Local Backend | `http://127.0.0.1:8000` | FastAPI backend |
| Swagger API Docs | `http://127.0.0.1:8000/docs` | Interactive API documentation |
| Health Check | `http://127.0.0.1:8000/health` | Backend health endpoint |

**Note:** The local URLs work only when the corresponding services are running on your computer. The deployed frontend does not automatically make a locally running backend accessible to external users.

---

## 📁 9. Project Structure

```text
Responso/
├── README.md
├── .gitignore
├── .npmrc
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── allocation.py
│   │   │   │   ├── audit.py
│   │   │   │   ├── auth.py
│   │   │   │   ├── dashboard.py
│   │   │   │   ├── deliveries.py
│   │   │   │   ├── inventory.py
│   │   │   │   ├── locations.py
│   │   │   │   ├── requests.py
│   │   │   │   ├── users.py
│   │   │   │   └── warehouses.py
│   │   │   └── deps.py
│   │   ├── allocation/
│   │   │   └── engine.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── seeds/
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
│
├── responso-_-disaster-relief-resource-optimizer/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── data/
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── offlineSync.ts
│   │   │   ├── optimizer.ts
│   │   │   └── storage.ts
│   │   ├── views/
│   │   ├── App.tsx
│   │   └── types.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── vercel.json
│
└── ReliefRoute_System_Documentation/
```

*This is a representative structure. Ensure directory and file names match the current repository.*

---

## 🚀 10. Installation and Setup

### Prerequisites

- Python 3.10 or later, with Python 3.13 used in the described environment.
- Node.js 18 or later.
- npm.
- Git (recommended).

### Step 1 — Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd Responso
```

Replace the placeholder with your actual GitHub repository URL.

### Step 2 — Configure the Backend

```bash
cd backend
python -m venv venv
```

Activate the virtual environment.

**Windows PowerShell:**

```powershell
.\venv\Scripts\Activate.ps1
```

**Linux/macOS:**

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure environment variables using `.env.example` as a reference. Set a secure application secret and the appropriate database settings before running the application.

If the project requires initial seed data, run:

```bash
python -m app.seeds.seed_data
```

Start the backend:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend API: `http://127.0.0.1:8000`

Interactive documentation: `http://127.0.0.1:8000/docs`

### Step 3 — Configure the Frontend

Open a second terminal from the project root:

```bash
cd responso-_-disaster-relief-resource-optimizer
npm install
npm run dev
```

Open the local address printed by Vite. If the Vite configuration specifies port 3000, use:

`http://localhost:3000`

### Step 4 — Verify the Application

- Confirm the backend health endpoint responds.
- Open the frontend and test login.
- Check the requests and inventory views.
- Generate a draft allocation run.
- Test the supported offline workflows with network connectivity disabled.
- Re-enable connectivity and verify the synchronization queue.

---

## ☁️ 11. Deployment

The frontend is configured for deployment on [Vercel](https://vercel.com).

### Frontend Deployment Checklist

1. Import the repository into Vercel.
2. Set the root directory to `responso-_-disaster-relief-resource-optimizer`.
3. Select the Vite framework preset.
4. Use `npm run build` as the build command.
5. Use `dist` as the output directory.
6. Configure environment variables required by the frontend.
7. Configure the frontend API base URL to point to a reachable, deployed backend.
8. Verify that SPA routing and production API requests work.

### Backend Deployment Considerations

The backend requires a reachable hosting environment, suitable persistent database storage, secure environment variables, and appropriate CORS configuration.

**Important:** A frontend deployment on Vercel does not, by itself, deploy the FastAPI backend. Localhost API URLs are accessible only from the machine running the backend, so they must not be used as public production API addresses.

---

## 🔐 12. Demo Accounts

The development environment is described as containing seeded accounts for different operational roles.

| Role | Intended Permissions |
|---|---|
| Logistics Coordinator | Review allocations, manage requests, coordinate deliveries |
| Operations Coordinator | Coordinate operational workflows |
| Field Dispatcher | Update delivery and convoy status |
| Inventory Manager | Manage stock records and movements |
| System Administrator | Manage users, permissions, and audit records |

For security, demo credentials should be documented only in a controlled development environment. Do not publish real passwords, production credentials, signing secrets, or private configuration values in a public repository.

---

## 🧪 13. Automated Testing

The project documentation reports **34 automated tests, with all 34 passing**.

| Test Suite | Reported Tests | Main Coverage |
|---|---:|---|
| Allocation Engine | 7 | Priority scoring, distance calculations, allocation logic |
| API Allocation Flow | 6 | Drafts, inventory operations, approval workflow |
| Authentication & Requests | 9 | Authentication, authorization, validation |
| Enhanced Features | 6 | Multi-depot allocation, idempotency, failure recovery |
| Persistence | 1 | Data persistence across restarts |
| Frontend Tests | 5 | Session handling, offline queue, retry logic |

### Run Backend Tests

From the repository root:

```bash
python -m pytest backend/tests/ -v
```

### Run Frontend Tests

```bash
cd responso-_-disaster-relief-resource-optimizer
npm test
```

Run these commands against the current codebase to confirm the reported test count and results.

---

## 🔌 14. REST API Endpoints

The backend exposes REST endpoints for authentication, request management, inventory, allocation, deliveries, users, and audit events.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/auth/login` | Authenticate and issue a token |
| `GET` | `/api/v1/auth/me` | Retrieve the current user |
| `POST` | `/api/v1/auth/logout` | Handle logout |
| `GET` | `/api/v1/dashboard/summary` | Retrieve dashboard metrics |
| `POST` | `/api/v1/dashboard/reset-demo` | Reset seeded demo data |
| `GET` | `/api/v1/requests/` | List assistance requests |
| `POST` | `/api/v1/requests/` | Create an assistance request |
| `GET` | `/api/v1/requests/{id}` | Retrieve request details |
| `PATCH` | `/api/v1/requests/{id}` | Update a request |
| `GET` | `/api/v1/warehouses/` | List depots |
| `GET` | `/api/v1/warehouses/{id}/inventory` | Retrieve depot inventory |
| `GET` | `/api/v1/inventory/` | Retrieve inventory across depots |
| `POST` | `/api/v1/inventory/movements` | Record stock movements |
| `GET` | `/api/v1/allocation-runs/` | List allocation runs |
| `POST` | `/api/v1/allocation-runs/` | Generate a draft allocation |
| `GET` | `/api/v1/allocation-runs/{id}` | Inspect allocation details |
| `POST` | `/api/v1/allocation-runs/{id}/approve` | Approve an allocation |
| `POST` | `/api/v1/allocation-runs/{id}/reject` | Reject an allocation |
| `GET` | `/api/v1/deliveries/` | List deliveries |
| `POST` | `/api/v1/deliveries/{id}/assign` | Assign a vehicle and driver |
| `PATCH` | `/api/v1/deliveries/{id}/status` | Update delivery status |
| `GET` | `/api/v1/users/` | List users |
| `PATCH` | `/api/v1/users/{id}` | Update permitted user fields |
| `GET` | `/api/v1/audit/events` | Inspect audit events |

Actual endpoint availability and authorization requirements should be confirmed against the running backend's OpenAPI documentation.

---

## 🏆 15. OpenHack'26 Challenge Alignment

**Challenge:** CL-03 — Disaster Relief Resource Optimizer  
**Category:** Climate & Disaster Resilience  
**Event:** OpenHack'26, Department of Software Engineering, MUET SZAB Campus, Khairpur

Responso addresses the challenge through the following capabilities:

| Challenge Need | Responso Approach |
|---|---|
| Demand and Supply Coordination | Connect assistance requests with depot inventory. |
| Emergency Prioritization | Calculate request scores using urgency, affected population, and waiting time. |
| Geographical Logistics | Estimate depot-to-request distances using the Haversine formula. |
| Resource Constraints | Consider available supplies, weight capacity, and delivery fleet availability. |
| Controlled Allocation | Require coordinator approval before committing allocation changes. |
| Delivery Visibility | Track convoy progress through defined delivery states. |
| Connectivity Resilience | Support configured offline workflows and queued synchronization. |
| Accountability | Maintain operational audit records and role-based access controls. |

### Expected Impact

Responso aims to help relief teams:

- Identify urgent assistance needs more systematically.
- Improve visibility into available supplies.
- Reduce avoidable delays in resource allocation.
- Coordinate relief deliveries across multiple depots.
- Maintain supported field workflows during network interruptions.
- Improve transparency in operational decision-making.

---

## 🛡️ 16. Security and Data Integrity

Responso incorporates security and integrity controls intended for a role-based operational system.

- **Authentication:** JWT-based authentication.
- **Password Protection:** bcrypt password hashing.
- **Authorization:** Role-based permissions for protected operations.
- **Data Validation:** Pydantic schemas for request and response validation.
- **Database Integrity:** SQLAlchemy ORM and relational constraints.
- **Transactional Operations:** Database transactions for configured allocation workflows.
- **Idempotency:** Unique operation keys for supported retry-safe operations.
- **Auditability:** Records of operational events and changes.
- **Environment Configuration:** Secrets and environment-specific settings managed outside source code.

Security depends on correct deployment configuration, protected credentials, appropriate token handling, and verification of the actual implementation.

---

## 👥 17. Team INNOHIVE

**Team INNOHIVE** developed Responso for the OpenHack'26 disaster resilience challenge.

| Team Member | Name |
|---|---|
| Member 1 | **Abdul Ahad** |
| Member 2 | **Devraj** |
| Member 3 | **Azhar** |

### Our Approach

As Team INNOHIVE, we focused on a practical disaster relief coordination problem: helping humanitarian teams organize requests, manage relief inventory, and make resource allocation decisions when time and connectivity are critical.

By combining a full-stack web application, explainable allocation logic, and offline-first capabilities, Responso demonstrates an approach to making disaster response operations more organized and resilient.

---

<div align="center">

### 🚨 Responso — Relief Coordination Without Connectivity as a Single Point of Failure

**Built with purpose by Team INNOHIVE**

🌐 Online Operations · 📡 Offline Resilience · 🧠 Smart Allocation · 🚚 Coordinated Relief

[Launch Responso](https://responso-disaster-relief-optimizer.vercel.app)

</div>
