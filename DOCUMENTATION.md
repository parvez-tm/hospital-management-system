# Hospital Management System - Documentation

## Overview

A **multi-tenant Hospital Management System** built with:

- **Backend:** Node.js, Express, Sequelize ORM, PostgreSQL
- **Frontend:** React (Vite), Tailwind CSS

Each hospital operates as an isolated tenant — doctors and patients within one hospital cannot see data from another hospital.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  ADMIN                       │
│  (Global - manages all hospitals)            │
└──────────────────┬──────────────────────────-┘
                   │
      ┌────────────┼────────────┐
      ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│Hospital A│ │Hospital B│ │Hospital C│   ← Tenants
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │
  ┌──┴──┐     ┌──┴──┐     ┌──┴──┐
  │Doc A│     │Doc B│     │Doc C│       ← Isolated per hospital
  │Pat A│     │Pat B│     │Pat C│
  └─────┘     └─────┘     └─────┘
```

### Multi-Tenancy

- Every non-admin user is linked to a `hospitalId`
- Unique constraints are scoped per hospital: `(username + hospitalId)`, `(email + hospitalId)`
- All queries for doctors/patients filter by `hospitalId` via `tenantIsolation` middleware
- Admin has global access across all hospitals

---

## Database (PostgreSQL + Sequelize)

### Tables

| Table | Description |
|-------|-------------|
| `hospitals` | Hospital entities (tenants) |
| `users` | All users (admin, doctor, patient) with role-based fields |
| `patient_vitals` | Medical records: vitals + prescriptions |

### Key Relationships

- `Hospital` → has many `Users`
- `Hospital` → has many `PatientVitals`
- `User (doctor)` → has many `PatientVitals`
- `User (patient)` → has many `PatientVitals`

Tables are auto-created/updated on server startup via `sequelize.sync({ alter: true })`.

---

## User Roles

| Role | Description |
|------|-------------|
| **admin** | Global admin. Manages hospitals, views all doctors/patients across hospitals. No `hospitalId`. |
| **doctor** | Belongs to a hospital. Can view patients in their hospital, add vitals/prescriptions. |
| **patient** | Belongs to a hospital. Can view own profile, vitals history, download reports. |

---

## API Endpoints

### Auth (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user (admin/doctor/patient) |
| POST | `/api/auth/login` | No | Login with username, password, role, hospitalId |
| GET | `/api/auth/me` | Yes | Get current user profile |

### Hospitals (`/api/hospitals`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/hospitals` | No | List active hospitals (for registration dropdown) |
| GET | `/api/hospitals/all` | Admin | List all hospitals with doctor/patient counts |
| POST | `/api/hospitals` | Admin | Create a new hospital |
| PUT | `/api/hospitals/:id` | Admin | Update a hospital |
| PATCH | `/api/hospitals/:id/toggle` | Admin | Toggle hospital active/inactive |
| GET | `/api/hospitals/:id/stats` | Admin | Get hospital statistics |

### Admin (`/api/admin`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/stats` | Admin | Dashboard stats (totals across all hospitals) |
| GET | `/api/admin/doctors` | Admin | List all doctors across hospitals |
| GET | `/api/admin/patients` | Admin | List all patients across hospitals |
| DELETE | `/api/admin/users/:id` | Admin | Delete a user and their related records |

### Doctor (`/api/doctor`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/doctor/patients` | Doctor | List patients in doctor's hospital |
| GET | `/api/doctor/patients/:id` | Doctor | Get patient details + vitals history |
| POST | `/api/doctor/vitals` | Doctor | Add vitals/prescription for a patient |
| GET | `/api/doctor/stats` | Doctor | Dashboard stats |

### Patient (`/api/patient`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/patient/profile` | Patient | Get own profile |
| PUT | `/api/patient/profile` | Patient | Update own profile |
| GET | `/api/patient/vitals` | Patient | Get own vitals history |
| GET | `/api/patient/vitals/:id` | Patient | Get single vitals record |
| GET | `/api/patient/stats` | Patient | Dashboard stats |

---

## Setup & Installation

### Prerequisites

- **Node.js** v18+
- **PostgreSQL** running locally (or remote)

### 1. Create the Database

```sql
CREATE DATABASE hospital_management;
```

### 2. Configure Environment

Edit `backend/.env`:

```env
PORT=5000
JWT_SECRET=your_secret_key_here

PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=hospital_management
PG_USER=postgres
PG_PASSWORD=your_password
```

### 3. Install & Run Backend

```bash
cd backend
npm install
npm run dev        # Development (nodemon - auto-restart)
# or
npm start          # Production
```

On first run, Sequelize will automatically create all tables.

### 4. Install & Run Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Creating the First Admin User

There is **no default admin account**. You need to create one first.

### Option A: Use the Seed Script

```bash
cd backend
node seed-admin.js
```

This creates an admin with:
- **Username:** `admin`
- **Password:** `admin123`

### Option B: Use the API Directly

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Super Admin",
    "email": "admin@system.com",
    "username": "admin",
    "password": "admin123",
    "contactNo": "0000000000",
    "role": "admin"
  }'
```

### Admin Login

Admin logs in via the **same login page** as everyone else:
- **Role:** Select "Admin"
- **Username:** `admin`
- **Password:** `admin123`
- **Hospital:** Not required (admin is global, not tied to any hospital)

---

## Login Payloads by Role

### Admin Login
```json
{
  "username": "admin",
  "password": "admin123",
  "role": "admin"
}
```

### Doctor Login
```json
{
  "username": "dr_smith",
  "password": "password",
  "role": "doctor",
  "hospitalId": 1
}
```

### Patient Login
```json
{
  "username": "john_doe",
  "password": "password",
  "role": "patient",
  "hospitalId": 1
}
```

---

## Project Structure

```
backend/
├── index.js                 # Entry point - Express server setup
├── package.json
├── .env                     # Environment variables
├── seed-admin.js            # Script to create first admin user
├── config/
│   └── db.js                # Sequelize + PostgreSQL connection
├── middleware/
│   └── auth.js              # JWT auth, role authorization, tenant isolation
├── models/
│   ├── index.js             # Model associations (relationships)
│   ├── Hospital.js           # Hospital model (tenant)
│   ├── User.js               # User model (admin/doctor/patient)
│   └── PatientVitals.js      # Vitals & prescriptions
├── routes/
│   ├── auth.js               # Register, login, profile
│   ├── hospital.js           # CRUD hospitals
│   ├── admin.js              # Admin dashboard & management
│   ├── doctor.js             # Doctor patient management
│   └── patient.js            # Patient self-service

frontend/
├── index.html
├── vite.config.js
├── package.json
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── services/
│   │   └── api.js            # Axios API client
│   ├── context/
│   │   └── AuthContext.jsx    # Auth state management
│   └── components/
│       ├── DashboardLayout.jsx
│       ├── ProtectedRoute.jsx
│       ├── StatCard.jsx
│       └── LoadingSpinner.jsx
```

---

## Scripts

| Command | Location | Description |
|---------|----------|-------------|
| `npm run dev` | backend/ | Start server with nodemon |
| `npm start` | backend/ | Start server with node |
| `node seed-admin.js` | backend/ | Create default admin user |
| `npm run dev` | frontend/ | Start Vite dev server |
| `npm run build` | frontend/ | Build for production |
