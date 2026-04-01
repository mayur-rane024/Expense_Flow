# Expense Reimbursement Management System

A production-grade, full-stack application featuring a **dynamic workflow engine** for multi-level expense approvals, **AI-powered receipt scanning**, and a sophisticated, themable user interface.

## 🚀 Key Features

*   **Dynamic Workflow Engine:** Create customized, multi-tier approval processes with specific rules (Percentage, Specific Approver, Hybrid) that are instantiated into isolated, runtime instances per expense trip.
*   **AI-Powered Form Auto-fill:** Integrated Optical Character Recognition (OCR) powered by Tesseract.js to automatically extract merchant names, dates, and amounts directly from receipt images.
*   **Concurrency & Reliability:** Rock-solid approval processing utilizing PostgreSQL transaction blocks and **Row-Level Locking (`SELECT ... FOR UPDATE`)** ensuring database integrity even if multiple managers approve an expense simultaneously.
*   **Live Currency Conversion:** Integrated with third-party APIs to natively support multi-currency expenses, giving approvers real-time standard conversion previews (USD). 
*   **Enterprise-Grade Theming:** Toggleable Light/Dark mode featuring a premium, bespoke glassmorphism UI built atop Tailwind CSS variables.
*   **Role-Based Access Control (RBAC):** Distinct hierarchical dashboards tailored for Employees, Managers, and System Admins. Security enforced across the stack with strict JWT validation.

---

## 🛠️ Technology Stack

### Frontend
*   **Framework:** React 18, Vite
*   **Styling:** Tailwind CSS, PostCSS, Custom CSS Variables
*   **State & Routing:** Context API, React Router DOM
*   **Data Visualization:** Recharts
*   **Features:** Tesseract.js (AI OCR Receipt Scanning) 

### Backend
*   **Runtime:** Node.js, Express
*   **Database:** PostgreSQL (Neon Tech Serverless Postgres)
*   **Authentication:** JWT, bcryptjs
*   **Validation & Logging:** Joi

---

## 🚀 Quick Start Guide

### 1. Set up the database (Neon PostgreSQL)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new Postgres project
3. Copy the database connection string

### 2. Configure Backend

Navigate to the backend directory and set up your `.env` configuration file:

```bash
cd backend
cp .env.example .env
```

Edit your fresh `.env` file and input your connection string:
```env
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-super-secret-key-minimum-32-characters
PORT=5000
```

### 3. Install & Run Backend

```bash
cd backend
npm install
npm run migrate          # Creates all DB tables
npm run dev              # Starts the API server on port 5000
```

### 4. Install & Run Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev              # Starts Vite server on port 5173
```

Open your browser and navigate to [http://localhost:5173](http://localhost:5173).

---

## 🧩 How the Dynamic Workflow Engine Works

### 1. Template Creation
Admins construct "Workflow Templates" determining the chain of command. Steps can stipulate rules like:
*   **PERCENTAGE:** Require X% of a manager pool to approve.
*   **SPECIFIC:** Mandate approval from a selected key stakeholder.
*   **HYBRID:** Combination of the above.

### 2. Runtime Instantiation
When an employee submits an expense, the active template is duplicated and snapshotted into the `expense_steps` table. This creates a sandboxed runtime instance ensuring modifications to the root template do not alter in-flight legacy expense approvals.

### 3. Transactional Execution
When approvers action a request:
1. Active steps undergo **row-level locking** (`SELECT ... FOR UPDATE`) resolving any race conditions.
2. The custom **rule engine** inspects conditions (Is the user an authorized manager? Have prerequisite thresholds been met?).
3. The workflow timeline seamlessly advances forward, rejects the parent claim, or flags the final payment for processing.

---

## 📁 Project Structure

```text
oodo/
├── backend/
│   ├── src/
│   │   ├── controllers/    # API Request Handlers
│   │   ├── db/             # PG Connection & Migrations
│   │   ├── middleware/     # JWT Auth, Validation
│   │   ├── routes/         # Express Routing layer
│   │   ├── services/       # Core Business Logic & Workflow Engine
│   │   └── validators/     # Input Joi Schemas
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/     # Reusable UI (Cards, Auth Forms, Charts, Forms)
    │   ├── context/        # Authentication Context
    │   ├── pages/          # Admin/Manager/Employee Dashboards
    │   └── services/       # Axios API bindings
    ├── tailwind.config.js  # Theme generation
    └── package.json
```

---

## 🔒 Security Best Practices

- **Bcrypt Password Hashing:** User passwords utilizing randomized salting mechanisms.
- **JWT Lifecycles:** Configurable, stateless authentication.
- **Row-Level Postgre Locking:** Bulletproof multi-manager concurency control mitigating double-approval state vulnerabilities.
- **Database Transactions:** Sequential step actions happen atomically. If any mid-step fails, nothing commits.
- **Parametrized Queries:** Defense against standard SQL injection vectoring.
- **CORS Mitigation:** Traffic dynamically constrained between approved UI endpoints and Server services.
