# Hospital Management System - Documentation

## Overview

A **Hospital Management System** with integrated **ESP32 IoT Health Monitoring**, built with:

- **Backend:** Node.js, Express, Sequelize ORM, PostgreSQL
- **Frontend:** React (Vite), Tailwind CSS
- **IoT Device:** ESP32 with MAX30102 (HR + SpO₂), DHT11 (Temp + Humidity) sensors

The system allows doctors to monitor patients in real-time using an ESP32 health monitoring device. A single device can be used for **multiple patients** through a session-based assignment system.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ADMIN PANEL (React)                             │
│  Doctor logs in → selects patient → starts monitoring session          │
│  Live vitals dashboard auto-refreshes every 3 seconds                 │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │ HTTP (port 5000)
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVER (Express.js)                        │
│                                                                        │
│  /api/auth      → Login, Register, Profile                            │
│  /api/admin     → Admin dashboard, manage users                       │
│  /api/doctor    → Patient list, add manual vitals                     │
│  /api/patient   → Patient self-service                                │
│  /api/device    → ESP32 data ingestion + session management    ← NEW  │
│                                                                        │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │ Sequelize ORM
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     PostgreSQL (hospital_management)                   │
│                                                                        │
│  users  │  patient_vitals  │  device_sessions  │  health_readings     │
└─────────────────────────────────────────────────────────────────────────┘
                  ▲
                  │ HTTP POST (WiFi, every 5 seconds)
┌─────────────────────────────────────────────────────────────────────────┐
│                        ESP32 DEVICE                                    │
│                                                                        │
│  MAX30102  → Heart Rate + SpO₂                                        │
│  DHT11     → Room Temperature + Humidity                              │
│  NTC       → Body/Skin Temperature                                    │
│  Algorithm → Estimated Blood Pressure (from heart rate)               │
│                                                                        │
│  Sends JSON to: http://<server-ip>:5000/api/device/health             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database (PostgreSQL + Sequelize)

### Tables

| Table | Description |
|-------|-------------|
| `users` | All users (admin, doctor, patient) with role-based fields |
| `patient_vitals` | Manual medical records: vitals + prescriptions (added by doctors) |
| `device_sessions` | Tracks which patient is being monitored by which device |
| `health_readings` | Automated sensor data from ESP32, tagged to a patient via sessions |

### Key Relationships

- `User (doctor)` → has many `PatientVitals`
- `User (patient)` → has many `PatientVitals`
- `User (doctor)` → starts `DeviceSessions`
- `User (patient)` → assigned to `DeviceSessions`
- `DeviceSession` → has many `HealthReadings`
- `User (patient)` → has many `HealthReadings`

Tables are auto-created/updated on server startup via `sequelize.sync({ alter: true })`.

---

## User Roles

| Role | Description |
|------|-------------|
| **admin** | Global admin. Manages hospitals, views all doctors/patients. Can also manage device sessions. |
| **doctor** | Can view patients, add manual vitals/prescriptions, **start/stop device monitoring sessions**. |
| **patient** | Can view own profile, vitals history, download reports. |

---

## ESP32 Device Monitoring — How It Works

### The Problem It Solves

In a hospital, you have **one monitoring device** but **many patients**. The system uses a **session-based approach** so the same device can monitor different patients at different times.

### The Flow

```
Step 1: Doctor logs into the admin panel
Step 2: Doctor navigates to a patient's detail page
Step 3: Doctor clicks "Start Monitoring" → a session is created
Step 4: ESP32 device is placed on the patient
Step 5: ESP32 sends vitals every 5 seconds → server auto-assigns readings to that patient
Step 6: Doctor sees LIVE vitals on the patient's page (auto-refreshes every 3 seconds)
Step 7: When done, doctor clicks "Stop Monitoring" → session ends
Step 8: Doctor can now start monitoring a DIFFERENT patient with the same device
```

### Step-by-Step Usage Guide

#### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

You'll see:
```
PostgreSQL Connected successfully
All models synced with database
Server running on port 5000
```

#### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

Opens at `http://localhost:5173`

#### 3. Login as a Doctor

- Go to the login page
- Enter doctor credentials
- Select role: **Doctor**

#### 4. Navigate to a Patient

- Click **"My Patients"** in the sidebar
- Click on a patient's name to open their detail page

#### 5. Start Monitoring

- Click the green **"Start Monitoring"** button (top-right)
- The system creates a monitoring session linking the ESP32 device to this patient
- You'll see a **"Live Monitoring"** panel appear with a pulsing green dot

#### 6. Power On the ESP32

- Connect the ESP32 device to power
- It will auto-connect to WiFi and start sending data to the server
- The device sends readings every **5 seconds**

#### 7. View Live Vitals

The live monitoring panel shows six real-time metrics:

| Metric | Source | Unit |
|--------|--------|------|
| Heart Rate | MAX30102 sensor | bpm |
| SpO₂ | MAX30102 sensor | % |
| Body Temperature | NTC thermistor | °C |
| Blood Pressure | Estimated from HR | mmHg |
| Room Temperature | DHT11 sensor | °C |
| Humidity | DHT11 sensor | % |

Below the metric cards, a **Recent Device Readings** table shows the last 20 readings with timestamps.

#### 8. Stop Monitoring

- Click the red **"Stop Monitoring"** button
- The session ends and shows how many readings were captured
- You can now start monitoring a **different patient** with the same device

#### 9. Monitor Another Patient

- Navigate to a different patient's page
- Click **"Start Monitoring"** again
- The device data will now be tagged to the new patient
- All previous patient's readings are preserved in their history

---

## API Endpoints

### Auth (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user (admin/doctor/patient) |
| POST | `/api/auth/login` | No | Login with username, password, role |
| GET | `/api/auth/me` | Yes | Get current user profile |

### Admin (`/api/admin`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/stats` | Admin | Dashboard stats (totals) |
| GET | `/api/admin/doctors` | Admin | List all doctors |
| GET | `/api/admin/patients` | Admin | List all patients |
| DELETE | `/api/admin/users/:id` | Admin | Delete a user and their related records |

### Doctor (`/api/doctor`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/doctor/patients` | Doctor | List patients |
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

### Device / ESP32 (`/api/device`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/device/health` | **None** | Receive sensor data from ESP32 device |
| POST | `/api/device/session/start` | Doctor/Admin | Start monitoring a patient |
| POST | `/api/device/session/stop` | Doctor/Admin | Stop the current monitoring session |
| GET | `/api/device/session/active` | Doctor/Admin | Get the currently active session |
| GET | `/api/device/sessions` | Doctor/Admin | Get all session history |
| GET | `/api/device/readings/:patientId` | Doctor/Admin | Get all readings for a patient |
| GET | `/api/device/readings/:patientId/latest` | Doctor/Admin | Get the most recent reading |
| GET | `/api/device/readings/:patientId/stats` | Doctor/Admin | Get averages and statistics |

---

## Device API — Detailed Reference

### `POST /api/device/health` (ESP32 → Server)

This is the endpoint the ESP32 sends data to. **No authentication required** — the device doesn't have login credentials.

**Request Body (sent by ESP32):**

```json
{
  "pulse_rate": 78,
  "spo2": 97,
  "body_temp": 36.4,
  "ntc_temp": 36.5,
  "env_temp": 28.3,
  "humidity": 65.2,
  "bp_systolic": 120,
  "bp_diastolic": 80,
  "timestamp": "2026-04-13T22:45:00"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "id": 42,
  "patientId": 5,
  "sessionActive": true
}
```

- `patientId` = the patient currently being monitored (from active session)
- `sessionActive` = whether a monitoring session is active
- If no session is active, `patientId` will be `null` and the reading is saved as "unassigned"

### `POST /api/device/session/start` (Doctor starts monitoring)

**Headers:** `Authorization: Bearer <jwt_token>`

**Request Body:**

```json
{
  "patientId": 5,
  "deviceId": "ESP32-001"
}
```

`deviceId` is optional — defaults to `"ESP32-001"`. Use it if you have multiple ESP32 devices.

**Response (201 Created):**

```json
{
  "message": "Monitoring session started",
  "session": {
    "id": 1,
    "deviceId": "ESP32-001",
    "patientId": 5,
    "doctorId": 2,
    "status": "active",
    "startedAt": "2026-04-13T17:15:00.000Z",
    "endedAt": null,
    "patient": { "id": 5, "name": "John Doe", "username": "john_doe" },
    "sessionDoctor": { "id": 2, "name": "Dr. Smith" }
  }
}
```

> **Note:** Starting a new session automatically ends any existing active session for the same device.

### `POST /api/device/session/stop` (Doctor stops monitoring)

**Headers:** `Authorization: Bearer <jwt_token>`

**Request Body:**

```json
{
  "deviceId": "ESP32-001"
}
```

**Response:**

```json
{
  "message": "Monitoring session stopped",
  "session": { ... },
  "readingsCount": 47
}
```

### `GET /api/device/readings/:patientId/stats` (Patient statistics)

**Headers:** `Authorization: Bearer <jwt_token>`

**Response:**

```json
{
  "count": 150,
  "latest": {
    "id": 150,
    "pulse_rate": 76,
    "spo2": 98,
    "body_temp": 36.6,
    "bp_systolic": 118,
    "bp_diastolic": 78,
    "createdAt": "2026-04-13T17:20:00.000Z"
  },
  "averages": {
    "pulse_rate": 76.4,
    "spo2": 97.2,
    "body_temp": 36.5,
    "env_temp": 27.8,
    "humidity": 63.1,
    "bp_systolic": 118.3,
    "bp_diastolic": 78.6
  }
}
```

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

On first run, Sequelize will automatically create all tables including `device_sessions` and `health_readings`.

### 4. Install & Run Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Configure the ESP32

Edit `ESP32_Health_sensor_code/src/main.cpp`:

**WiFi credentials** (line 49–51):
```cpp
wifiMulti.addAP("Your_WiFi_Name", "Your_WiFi_Password");
```

**Server IP** (line 176):
```cpp
http.begin("http://<YOUR_PC_IP>:5000/api/device/health");
```

To find your PC's IP:
- **Windows:** Run `ipconfig` → look for `IPv4 Address` under your WiFi adapter
- **Linux/macOS:** Run `ifconfig` or `ip addr`

**Build & Upload the ESP32:**
1. Open `ESP32_Health_sensor_code/` in VS Code with PlatformIO
2. Click ✓ (Build) then → (Upload)
3. Open Serial Monitor at 115200 baud to verify

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
  "role": "doctor"
}
```

### Patient Login
```json
{
  "username": "john_doe",
  "password": "password",
  "role": "patient"
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
│   ├── User.js              # User model (admin/doctor/patient)
│   ├── PatientVitals.js     # Manual vitals & prescriptions
│   ├── DeviceSession.js     # Device monitoring sessions         ← NEW
│   └── HealthReading.js     # ESP32 sensor readings              ← NEW
├── routes/
│   ├── auth.js              # Register, login, profile
│   ├── admin.js             # Admin dashboard & management
│   ├── doctor.js            # Doctor patient management
│   ├── patient.js           # Patient self-service
│   └── device.js            # ESP32 data + session management    ← NEW

frontend/
├── index.html
├── vite.config.js
├── package.json
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── services/
│   │   └── api.js            # Axios API client (includes device APIs)
│   ├── context/
│   │   └── AuthContext.jsx    # Auth state management
│   ├── pages/
│   │   ├── auth/             # Login, Register, Admin Login
│   │   ├── admin/            # Admin dashboard, manage hospitals/doctors/patients
│   │   ├── doctor/           # Doctor dashboard, patient list, patient detail + LIVE MONITORING
│   │   └── patient/          # Patient dashboard, vitals, profile
│   └── components/
│       ├── DashboardLayout.jsx
│       ├── ProtectedRoute.jsx
│       ├── StatCard.jsx
│       └── LoadingSpinner.jsx

ESP32_Health_sensor_code/
├── src/
│   └── main.cpp              # ESP32 firmware (reads sensors, posts to /api/device/health)
├── platformio.ini            # PlatformIO configuration
└── README.md                 # Hardware documentation
```

---

## Database Schema Reference

### `device_sessions` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Auto-increment primary key |
| `deviceId` | STRING | Device identifier (default: `"ESP32-001"`) |
| `patientId` | INTEGER (FK) | References `users.id` — which patient is being monitored |
| `doctorId` | INTEGER (FK) | References `users.id` — which doctor started the session |
| `startedAt` | TIMESTAMP | When the session was started |
| `endedAt` | TIMESTAMP | When the session was stopped (null = still active) |
| `status` | ENUM | `'active'` or `'completed'` |
| `createdAt` | TIMESTAMP | Auto-set by Sequelize |
| `updatedAt` | TIMESTAMP | Auto-set by Sequelize |

### `health_readings` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Auto-increment primary key |
| `patientId` | INTEGER (FK) | References `users.id` — auto-assigned from active session |
| `sessionId` | INTEGER (FK) | References `device_sessions.id` — which session this reading belongs to |
| `deviceId` | STRING | Which device sent this reading |
| `pulse_rate` | INTEGER | Heart rate in BPM |
| `spo2` | INTEGER | Blood oxygen saturation (%) |
| `body_temp` | FLOAT | Body/skin temperature (°C) |
| `ntc_temp` | FLOAT | NTC thermistor temperature (°C) |
| `env_temp` | FLOAT | Room/environment temperature (°C) |
| `humidity` | FLOAT | Room humidity (%) |
| `bp_systolic` | INTEGER | Estimated systolic blood pressure (mmHg) |
| `bp_diastolic` | INTEGER | Estimated diastolic blood pressure (mmHg) |
| `timestamp` | STRING | ISO timestamp from ESP32's NTP clock |
| `createdAt` | TIMESTAMP | Auto-set by Sequelize |
| `updatedAt` | TIMESTAMP | Auto-set by Sequelize |

---

## Multiple Devices

The system supports multiple ESP32 devices. Each device has a `deviceId` string (default: `"ESP32-001"`).

To use multiple devices:

1. In `main.cpp`, add a `deviceId` field to the JSON payload:

```cpp
json += "\"deviceId\":\"ESP32-002\",";  // unique ID for this device
```

2. When starting a session, specify which device:

```json
{
  "patientId": 5,
  "deviceId": "ESP32-002"
}
```

Each device has its own independent session. You can monitor multiple patients simultaneously using different devices.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Server won't start** | Check PostgreSQL is running. Verify `.env` credentials. Run `npm install`. |
| **ESP32 data not appearing** | Verify the IP in `main.cpp` matches your PC's IP. Check firewall allows port 5000. |
| **"No active session" in readings** | A doctor must click "Start Monitoring" before readings are tagged to a patient. |
| **Live panel shows "Waiting for data"** | ESP32 isn't sending data — check serial monitor for errors. |
| **Readings saved with `patientId: null`** | No session was active. Start a session via the UI or API before powering the device. |
| **Wrong patient getting readings** | Stop the current session and start a new one for the correct patient. |
| **MAX30102 not found** | Check I2C wiring — SDA to GPIO 21, SCL to GPIO 22. Power the sensor at 3.3V. |
| **DHT read failed** | Check wiring to GPIO 4. Use a 10kΩ pull-up resistor between VCC and Data. |
| **Blood pressure seems wrong** | BP is estimated from heart rate — it's an approximation, not a direct measurement. |

---

## Scripts

| Command | Location | Description |
|---------|----------|-------------|
| `npm run dev` | backend/ | Start server with nodemon (auto-restart) |
| `npm start` | backend/ | Start server with node |
| `node seed-admin.js` | backend/ | Create default admin user |
| `npm run dev` | frontend/ | Start Vite dev server |
| `npm run build` | frontend/ | Build for production |
