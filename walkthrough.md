# Walkthrough: ESP32 Server Merge + Multi-Patient Device Support

## What Changed

### Problem
1. The ESP32 health monitor ran as a **separate server** (port 3000, `healthmon` DB) — disconnected from the admin panel
2. Health readings had **no patient association** — the device could only be used for one patient

### Solution
Merged everything into one server with a **session-based** multi-patient system.

---

## Files Created

| File | Purpose |
|------|---------|
| [DeviceSession.js](file:///e:/Hospital-Management/backend/models/DeviceSession.js) | Tracks which patient is being monitored by which device |
| [HealthReading.js](file:///e:/Hospital-Management/backend/models/HealthReading.js) | Stores ESP32 sensor data, now with `patientId` and `sessionId` |
| [device.js](file:///e:/Hospital-Management/backend/routes/device.js) | 8 API endpoints for device data + session management |

## Files Modified

| File | Change |
|------|--------|
| [models/index.js](file:///e:/Hospital-Management/backend/models/index.js) | Added DeviceSession + HealthReading associations |
| [backend/index.js](file:///e:/Hospital-Management/backend/index.js) | Registered `/api/device` route |
| [api.js](file:///e:/Hospital-Management/frontend/src/services/api.js) | Added 6 device API functions |
| [PatientDetail.jsx](file:///e:/Hospital-Management/frontend/src/pages/doctor/PatientDetail.jsx) | Added live monitoring UI with Start/Stop buttons |
| [main.cpp](file:///e:/Hospital-Management/ESP32_Health_sensor_code/src/main.cpp) | Updated URL: port 3000 → 5000, `/api/health` → `/api/device/health` |

---

## How It Works Now

```
Doctor opens patient page → clicks "Start Monitoring"
       ↓
Server creates a DeviceSession { patientId: 5, deviceId: "ESP32-001", status: "active" }
       ↓
ESP32 sends POST /api/device/health every 5 seconds
       ↓
Server looks up active session → auto-tags reading with patientId: 5
       ↓
Doctor's page polls every 3s → shows live vitals (HR, SpO2, Temp, BP, Humidity)
       ↓
Doctor clicks "Stop Monitoring" → session ends
       ↓
Doctor can now start monitoring a DIFFERENT patient with the same device
```

## New API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/device/health` | None | ESP32 sends readings here |
| `POST` | `/api/device/session/start` | Doctor/Admin | Start monitoring a patient |
| `POST` | `/api/device/session/stop` | Doctor/Admin | End monitoring |
| `GET` | `/api/device/session/active` | Doctor/Admin | Check current session |
| `GET` | `/api/device/sessions` | Doctor/Admin | Session history |
| `GET` | `/api/device/readings/:patientId` | Doctor/Admin | Patient's readings |
| `GET` | `/api/device/readings/:patientId/latest` | Doctor/Admin | Most recent reading |
| `GET` | `/api/device/readings/:patientId/stats` | Doctor/Admin | Averages & stats |

## Verification Results

- ✅ Backend boots on port 5000 — all models synced
- ✅ `POST /api/device/health` saves readings (patientId=null when no session)
- ✅ `GET /api/device/session/active` returns null when no session active
- ✅ Auth endpoints unaffected (admin login tested)

## What You Need To Do

1. **Flash the ESP32** with the updated `main.cpp` (URL changed to port 5000)
2. The old `server/` directory is no longer needed — you can delete it or keep as archive
3. No database migration needed — Sequelize auto-creates the new tables (`device_sessions`, `health_readings`) on startup
