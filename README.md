# 🌍 Responso — Disaster Relief Resource Optimizer

**An intelligent, offline-capable platform for optimizing disaster relief resource allocation during floods and other emergencies.**

Responso helps disaster response teams identify urgent community needs, prioritize relief requests, and allocate limited resources more effectively. By combining urgency, population impact, waiting time, and geographical distance, the system supports data-driven relief planning when every minute matters.

---

## 🔗 Explore Responso Locally

| Component | Local URL |
|---|---|
| 🌐 Frontend Application | [http://localhost:3000](http://localhost:3000) |
| ⚙️ Backend API | [http://127.0.0.1:8000/](http://127.0.0.1:8000/) |
| 📚 API Documentation (Swagger) | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) |
| ❤️ Backend Health Check | [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) |

> **Important:** Start the frontend and backend locally before opening these links. The links work on the computer running the services; they are not public internet links. If the frontend starts on a different port, use the URL printed in the terminal.

---

## 📌 Project Overview

| Detail | Description |
|---|---|
| Project Name | Responso — Disaster Relief Resource Optimizer |
| Event | OpenHack'26 |
| Category | Category 4 — Climate & Disaster Resilience |
| Problem ID | CL-03 |
| Team Name | INNOHIVE |
| Project Type | Full-stack disaster management platform |
| Primary Goal | Improve the prioritization and allocation of disaster relief resources |

### The Problem

During floods and other emergencies, relief organizations often face challenges such as:

- Multiple communities requesting assistance at the same time.
- Limited food, clean water, medical supplies, and shelter resources.
- Difficulty identifying which requests require immediate attention.
- Delays in coordinating available resources with affected locations.
- Poor connectivity in disaster-affected areas.
- Limited visibility into resource availability and distribution.

These challenges can delay assistance to the communities that need it most.

### Our Solution

Responso provides a centralized platform to help response teams manage relief requests, evaluate community needs, and prioritize resource allocation.

The system combines urgency, population impact, waiting time, and distance to calculate a priority score for each request. It also aims to support essential workflows when internet connectivity is unavailable, subject to the offline capabilities implemented in the application.

### Key Objectives

- Prioritize critical relief requests.
- Support more informed resource allocation.
- Improve visibility into relief requests and available supplies.
- Help response teams coordinate relief activities.
- Support essential application workflows during connectivity interruptions.
- Reduce delays caused by manual prioritization.

---

## ✨ Key Features

### 1. Intelligent Request Prioritization

The system calculates a priority score using multiple factors:

- **Urgency:** How serious the community's situation is.
- **Population impact:** How many people may be affected.
- **Waiting time:** How long the request has remained unresolved.
- **Distance:** The geographical distance between relevant locations.

### 2. Relief Resource Management

The platform is designed to support the management and allocation of essential supplies, including:

- Clean water
- Emergency food packs
- First aid kits
- Shelter tents
- Hygiene packs

Actual allocation depends on available inventory, configured workflows, and the system's current data.

### 3. Disaster Request Management

Response teams can use the application to organize and review relief requests and determine which cases require attention first.

### 4. Geographical Awareness

Geographical distance can help response teams consider the proximity of affected communities and available resources when planning distribution.

### 5. Online and Offline Support

Responso is designed to support online operation and selected offline workflows.

- **Online mode:** Communicates with the backend when connectivity is available.
- **Offline mode:** Can use configured application caching and local storage for supported operations.
- **Synchronization:** Queued changes may be synchronized after connectivity returns, where the relevant synchronization workflow has been implemented.

Offline functionality depends on the specific features configured in the application. It should not be assumed that every API operation or feature works without a network connection.

### 6. Backend API

The backend provides endpoints for application functionality and exposes interactive API documentation through Swagger.

### 7. Data Management

The backend uses a database to manage application data. SQLite and its write-ahead logging configuration are part of the documented technology stack.

### 8. Access Control

Authentication and role-based access control are included in the documented backend design. Available permissions depend on the configured application roles and endpoints.

---

## 🧮 Resource Prioritization Algorithm

Responso uses a weighted scoring approach to rank relief requests.

### Priority Formula

\[
S_i = 0.50U_i + 0.35P_i + 0.15W_i
\]

Where:

- \(S_i\) = priority score for request \(i\)
- \(U_i\) = normalized urgency value
- \(P_i\) = normalized population impact
- \(W_i\) = normalized waiting time

The weights assign 50% importance to urgency, 35% to population impact, and 15% to waiting time.

### Urgency Values

| Urgency Level | Normalized Value |
|---|---:|
| Critical | 1.00 |
| High | 0.75 |
| Moderate | 0.50 |
| Low | 0.25 |

### Normalization

The documented normalization approach uses the following reference values:

- **Population:** 10,000 people
- **Waiting time:** 72 hours

A normalized factor should be bounded to its intended range if the implementation is designed to produce scores between 0 and 1.

For example:

\[
P_i = \min\left(\frac{\text{Affected Population}}{10000},1\right)
\]

\[
W_i = \min\left(\frac{\text{Waiting Hours}}{72},1\right)
\]

These equations describe the intended normalization approach; the actual implementation should be checked to confirm the same behavior.

### Distance Calculation

The system uses the Haversine formula to estimate the great-circle distance between two geographical coordinates on Earth.

This helps the system consider geographical proximity when planning relief distribution.

**Important:** Distance is a separate geographical factor in the documented design. It is not included in the displayed weighted priority formula unless the implementation explicitly adds it.

### How Prioritization Works

1. Receive or retrieve relief requests.
2. Evaluate each request's urgency.
3. Normalize population impact and waiting time.
4. Calculate the weighted priority score.
5. Rank requests according to their scores.
6. Consider geographical distance and resource availability when planning distribution.

The ranking supports decision-making; it does not replace emergency personnel or on-ground assessments.

---

## 🏗️ System Architecture

Responso follows a frontend-and-backend architecture.

```text
                    ┌─────────────────────────┐
                    │       User / Team       │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    React Frontend        │
                    │ TypeScript + Tailwind    │
                    │ Maps + Offline Support   │
                    └────────────┬────────────┘
                                 │
                         HTTP API Requests
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     FastAPI Backend      │
                    │ Authentication + Logic   │
                    │ Request Prioritization   │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │       SQLite DB          │
                    │ Application Data         │
                    └─────────────────────────┘
```

The frontend provides the user interface, while the backend handles API requests and server-side processing. The database stores application data.

---

## 🛠️ Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 19 | User interface |
| TypeScript | Type-safe application development |
| Vite | Development server and build tooling |
| Tailwind CSS v4 | Styling and responsive layouts |
| Leaflet | Interactive maps |
| Progressive Web App (PWA) support | Application caching and selected offline workflows |
| Local Storage | Local client-side data where implemented |

### Backend

| Technology | Purpose |
|---|---|
| Python | Backend programming language |
| FastAPI | REST API framework |
| Uvicorn | ASGI application server |
| Pydantic v2 | Data validation |
| SQLite | Relational database |
| SQLite WAL | Database write-ahead logging |
| SQLAlchemy 2.0 | Database interaction |
| JWT | Token-based authentication |
| bcrypt | Password hashing |
| Role-Based Access Control (RBAC) | Permission management |

### Testing and Development

- `pytest` for Python backend tests.
- Node.js test runner and `tsx` for configured TypeScript tests.
- Git and GitHub for version control and collaboration.
- Visual Studio Code as a development environment.

The stack above reflects the project's documented technologies. Exact package versions and feature availability should be verified against the current source code and dependency files.

---

## 📂 Project Structure

The repository contains the backend, frontend application, and system documentation.

```text
Responso/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   └── seeds/
│   │       └── seed_data.py
│   ├── tests/
│   └── requirements.txt
│
├── responso-_-disaster-relief-resource-optimizer/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── ReliefRoute_System_Documentation/
│
└── README.md
```

> The structure is illustrative. Some files and subdirectories may differ in your current repository. Keep the README aligned with the actual files in GitHub.

---

## 🚀 Getting Started

Follow these steps to run Responso on your local computer.

### Prerequisites

Install the following:

- Python 3.10 or a compatible version supported by the backend dependencies.
- Node.js and npm.
- Git.
- Visual Studio Code or another code editor.

Confirm that Python and Node.js are available:

```bash
python --version
node --version
npm --version
```

### Step 1: Clone the Repository

If you have not already cloned the project, run:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd YOUR_REPOSITORY_FOLDER
```

Replace the placeholders with your actual GitHub repository URL and folder name.

If you already have the repository on your computer, open that folder in your terminal instead.

### Step 2: Set Up the Backend

Open a terminal in the project root:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

If PowerShell blocks script execution, use Command Prompt instead:

```bat
venv\Scripts\activate.bat
```

On Linux or macOS:

```bash
source venv/bin/activate
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

### Step 3: Initialize Sample Data (If Required)

If the application requires seeded sample data, run:

```bash
python -m app.seeds.seed_data
```

Run this only if the seed script exists and is appropriate for your current database setup. Check the script before executing it against any database containing important data.

### Step 4: Start the Backend Server

From the `backend` directory, run:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend should now be available at:

- **Backend API:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Swagger Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

The health-check URL works only if the backend defines that endpoint. If any URL returns a 404, check the routes implemented in `app/main.py` and the related router files.

Keep this terminal running.

### Step 5: Set Up the Frontend

Open a **second terminal** in the project root.

Navigate to the frontend directory:

```bash
cd responso-_-disaster-relief-resource-optimizer
```

Install the frontend dependencies:

```bash
npm install
```

### Step 6: Start the Frontend

Run:

```bash
npm run dev
```

Vite will display the local development URL in the terminal.

If the project is configured to use port `3000`, open:

**[http://localhost:3000](http://localhost:3000)**

If Vite displays a different port, use the URL shown in your terminal.

### Step 7: Explore the Application

Once both services are running, open the frontend and explore the available features.

| What to Explore | Link |
|---|---|
| Frontend | [http://localhost:3000](http://localhost:3000) |
| Backend API | [http://127.0.0.1:8000/](http://127.0.0.1:8000/) |
| Interactive API Docs | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) |
| Backend Health | [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) |

These addresses assume the services are running on their configured ports. The root API endpoint may return a simple response or a 404 if no root route is defined; Swagger is the recommended starting point for exploring the available API endpoints.

---

## 🧪 Testing

Responso includes backend and frontend tests in its documented testing setup.

### Backend Tests

Activate the backend virtual environment, navigate to the `backend` directory, and run:

```bash
pytest
```

### Frontend Tests

Navigate to the frontend directory and inspect the available scripts:

```bash
npm run
```

Run the test script defined in `package.json`. For example, if a `test` script exists:

```bash
npm test
```

### Test Results

The project has previously been reported as having **34 passing tests**:

| Test Suite | Previously Reported |
|---|---:|
| Backend | 29 tests |
| Frontend | 5 tests |
| **Total** | **34 tests** |

These are previously reported results, not a guarantee that every test currently passes. Run the commands above to verify the current repository state before presenting these numbers as confirmed results.

---

## 🔐 Security Considerations

Security is important in disaster response systems because they may handle sensitive operational information.

The documented backend stack includes JWT authentication, bcrypt password hashing, and role-based access control.

Recommended practices include:

- Store secrets and signing keys in environment variables.
- Never commit real passwords, tokens, or private keys to GitHub.
- Use strong, unique credentials for administrator accounts.
- Enforce permissions on protected backend endpoints.
- Validate user input on the server.
- Use HTTPS and suitable production security settings when deploying publicly.
- Restrict database and administrative access.
- Review offline data storage before storing sensitive information on devices.

Local development settings should not automatically be treated as production-ready security settings.

---

## 🌐 Online and Offline Operation

Disaster-affected locations may experience unstable internet connectivity. Responso is designed to support selected workflows under these conditions.

### Online Operation

When the network is available, the frontend can communicate with the backend to perform supported API operations.

### Offline Operation

Depending on the implemented configuration, the frontend may use:

- A cached application shell.
- Local storage for selected data.
- Queued operations for supported actions.
- Synchronization after the connection returns.

### Important Limitations

- The backend cannot be reached through `127.0.0.1` from another device as though it were a public server.
- Browser caching alone does not make every application feature work offline.
- Offline writes need a defined queue and conflict-handling strategy.
- Data synchronization should account for duplicate requests and failed operations.
- The actual offline behavior must be tested by disconnecting the network and verifying each supported workflow.

---

## 🎯 Alignment With the Challenge

**Problem ID: CL-03 — Disaster Relief Resource Optimizer**

Responso addresses the challenge of coordinating relief resources during floods and other emergencies.

| Challenge | Responso's Approach |
|---|---|
| Multiple urgent requests | Weighted request prioritization |
| Limited relief supplies | Resource and allocation management |
| Large affected populations | Population-impact scoring |
| Delayed assistance | Waiting-time scoring |
| Geographical constraints | Distance calculation |
| Unstable connectivity | Selected offline-capable workflows |
| Need for operational visibility | Centralized application interface |

The platform is intended to help response teams make more informed allocation decisions. Real-world outcomes would require validation with representative disaster-response data and operational testing.

---

## 👥 Team INNOHIVE

The project was developed by Team INNOHIVE for OpenHack'26.

| Team Member | Role |
|---|---|
| Abdul Ahad | Team Member |
| Devraj | Team Member |
| Azhar | Team Member |

*Update these roles to reflect each member's actual contribution before final submission.*

---

## 🔮 Future Improvements

Potential areas for future development include:

- Integrating verified live disaster and weather data.
- Improving the resource allocation algorithm with operational constraints.
- Adding more detailed inventory and distribution tracking.
- Improving offline queue reliability and conflict resolution.
- Adding notifications for critical requests.
- Improving map-based relief coordination.
- Providing analytical dashboards for response teams.
- Evaluating prioritization results using historical or simulated disaster scenarios.
- Adding audit logs for important resource allocation decisions.
- Conducting usability and performance testing with relief personnel.

These are proposed improvements and should not be interpreted as already implemented features.

---

## 🤝 Contributing

Contributions and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make focused changes.
4. Run the relevant tests.
5. Commit your changes with a clear message.
6. Open a pull request describing the changes.

Example:

```bash
git checkout -b feature/your-feature
git add .
git commit -m "Add your feature"
git push origin feature/your-feature
```

---

## 📄 Documentation

The repository includes a `ReliefRoute_System_Documentation/` directory for system-related documentation.

Refer to the documentation and source code for implementation details, configuration requirements, API routes, and supported workflows.

---

## ⚠️ Disclaimer

Responso is a disaster-relief resource optimization project developed for a hackathon challenge. It is intended to support decision-making, not replace emergency authorities, professional responders, or field assessments.

Before real-world use, the system would require security review, operational validation, data-quality checks, and testing under realistic disaster-response conditions.

---

## 📜 License

No license has been specified here. Add a suitable `LICENSE` file and update this section if you intend to distribute the project under an open-source license.

---

**Built by Team INNOHIVE for OpenHack'26.**

*Responso — Prioritizing needs. Coordinating resources. Supporting faster relief.*
