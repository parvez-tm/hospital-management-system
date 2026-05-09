const express = require("express");
const { User, DeviceSession, HealthReading, PatientVitals } = require("../models");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
const MONITORING_ROLES = ["doctor", "patient", "admin"];

const resolveSessionDoctorId = async (user, patient) => {
  if (user.role !== "patient") {
    return user.id;
  }

  if (patient.assignedDoctor) {
    return patient.assignedDoctor;
  }

  const fallbackDoctor = await User.findOne({
    where: { role: "doctor" },
    attributes: ["id"],
    order: [["id", "ASC"]],
  });

  return fallbackDoctor ? fallbackDoctor.id : user.id;
};

const canAccessPatient = async (user, patientId) => {
  if (user.role === "admin") {
    return true;
  }

  if (user.role === "patient") {
    return String(user.id) === String(patientId);
  }

  if (user.role !== "doctor") {
    return false;
  }

  const patient = await User.findOne({
    where: { id: patientId, role: "patient" },
    attributes: ["id", "assignedDoctor"],
  });

  if (!patient) {
    return false;
  }

  if (String(patient.assignedDoctor) === String(user.id)) {
    return true;
  }

  const clinicalRecordCount = await PatientVitals.count({
    where: { patientId, doctorId: user.id },
  });

  return clinicalRecordCount > 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/device/health — Receive data from ESP32 (NO AUTH — device endpoint)
// The ESP32 doesn't have a JWT token; it just posts raw sensor data.
// The server looks up the active session and tags the reading to that patient.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/health", async (req, res) => {
  try {
    const deviceId = req.body.deviceId || "ESP32-001";

    // Find the currently active session for this device
    const activeSession = await DeviceSession.findOne({
      where: {
        deviceId,
        status: "active",
        endedAt: null,
      },
    });

    // Create the reading — with or without a patient assignment
    const readingData = {
      pulse_rate: req.body.pulse_rate,
      spo2: req.body.spo2,
      body_temp: req.body.body_temp,
      env_temp: req.body.env_temp,
      humidity: req.body.humidity,
      bp_systolic: req.body.bp_systolic,
      bp_diastolic: req.body.bp_diastolic,
      timestamp: req.body.timestamp,
      deviceId,
      patientId: activeSession ? activeSession.patientId : null,
      sessionId: activeSession ? activeSession.id : null,
    };

    const reading = await HealthReading.create(readingData);

    console.log(
      `[${new Date().toLocaleTimeString()}] Health reading saved:`,
      {
        id: reading.id,
        patientId: reading.patientId || "unassigned",
        hr: reading.pulse_rate,
        spo2: reading.spo2,
        temp: reading.body_temp,
      }
    );

    res.status(201).json({
      success: true,
      id: reading.id,
      patientId: reading.patientId,
      sessionActive: !!activeSession,
    });
  } catch (err) {
    console.error("Error saving health reading:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/device/session/start — Doctor/Patient starts monitoring
// Doctors can monitor any patient, Patients can only monitor themselves
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/session/start",
  protect,
  async (req, res) => {
    try {
      const { patientId, deviceId = "ESP32-001" } = req.body;

      if (!patientId) {
        return res.status(400).json({ message: "patientId is required" });
      }

      // Authorization: Doctors/Admins can monitor any patient, Patients can only monitor themselves
      if (req.user.role === "patient" && String(req.user.id) !== String(patientId)) {
        return res.status(403).json({ message: "Patients can only monitor themselves" });
      }

      if (!MONITORING_ROLES.includes(req.user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Verify the patient exists
      const patient = await User.findOne({
        where: { id: patientId, role: "patient" },
      });
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      if (!(await canAccessPatient(req.user, patientId))) {
        return res.status(403).json({ message: "You cannot monitor this patient" });
      }

      const sessionDoctorId = await resolveSessionDoctorId(req.user, patient);

      // End any existing active session for this device
      await DeviceSession.update(
        { status: "completed", endedAt: new Date() },
        {
          where: {
            deviceId,
            status: "active",
            endedAt: null,
          },
        }
      );

      // Create new session
      const session = await DeviceSession.create({
        deviceId,
        patientId,
        doctorId: sessionDoctorId,
        startedAt: new Date(),
        status: "active",
      });

      const sessionWithPatient = await DeviceSession.findByPk(session.id, {
        include: [
          { model: User, as: "patient", attributes: ["id", "name", "username"] },
          { model: User, as: "sessionDoctor", attributes: ["id", "name"] },
        ],
      });

      console.log(
        `[${new Date().toLocaleTimeString()}] Session started: Device ${deviceId} → Patient "${patient.name}" (ID: ${patientId})`
      );

      res.status(201).json({
        message: "Monitoring session started",
        session: sessionWithPatient,
      });
    } catch (err) {
      console.error("Error starting session:", err.message);
      res.status(500).json({ message: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/device/session/stop — Doctor/Patient stops monitoring
// Doctors can stop any session, Patients can only stop their own sessions
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/session/stop",
  protect,
  async (req, res) => {
    try {
      const { deviceId = "ESP32-001" } = req.body;

      const session = await DeviceSession.findOne({
        where: {
          deviceId,
          status: "active",
          endedAt: null,
        },
        include: [
          { model: User, as: "patient", attributes: ["id", "name"] },
        ],
      });

      if (!session) {
        return res.status(404).json({ message: "No active session found for this device" });
      }

      // Authorization: Doctors/Admins can stop any session, Patients can only stop their own
      if (req.user.role === "patient" && String(session.patientId) !== String(req.user.id)) {
        return res.status(403).json({ message: "Patients can only stop their own monitoring sessions" });
      }

      if (!MONITORING_ROLES.includes(req.user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (!(await canAccessPatient(req.user, session.patientId))) {
        return res.status(403).json({ message: "You cannot stop this monitoring session" });
      }

      session.status = "completed";
      session.endedAt = new Date();
      await session.save();

      // Count readings captured during this session
      const readingCount = await HealthReading.count({
        where: { sessionId: session.id },
      });

      console.log(
        `[${new Date().toLocaleTimeString()}] Session stopped: Device ${deviceId} — ${readingCount} readings captured`
      );

      res.json({
        message: "Monitoring session stopped",
        session,
        readingsCount: readingCount,
      });
    } catch (err) {
      console.error("Error stopping session:", err.message);
      res.status(500).json({ message: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/device/session/active — Get currently active session
// Doctors/Admins can check any device, Patients can check their own
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/session/active",
  protect,
  async (req, res) => {
    try {
      const { deviceId = "ESP32-001", patientId } = req.query;

      if (!MONITORING_ROLES.includes(req.user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      let whereClause = {
        deviceId,
        status: "active",
        endedAt: null,
      };

      // Patients can only see their own active session
      if (req.user.role === "patient") {
        whereClause.patientId = req.user.id;
      } else if (patientId) {
        if (!(await canAccessPatient(req.user, patientId))) {
          return res.status(403).json({ message: "You cannot view this patient's session" });
        }
        whereClause.patientId = patientId;
      }

      const session = await DeviceSession.findOne({
        where: whereClause,
        include: [
          { model: User, as: "patient", attributes: { exclude: ["password"] } },
          { model: User, as: "sessionDoctor", attributes: ["id", "name"] },
        ],
      });

      res.json({ session: session || null });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/device/sessions — Get all sessions (history)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/sessions",
  protect,
  authorize("doctor", "admin"),
  async (req, res) => {
    try {
      const sessions = await DeviceSession.findAll({
        include: [
          { model: User, as: "patient", attributes: ["id", "name", "username"] },
          { model: User, as: "sessionDoctor", attributes: ["id", "name"] },
        ],
        order: [["createdAt", "DESC"]],
        limit: 50,
      });
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/device/readings/:patientId — Get health readings for a patient
// Doctors/Admins can get any patient's readings, Patients can get their own
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/readings/:patientId",
  protect,
  async (req, res) => {
    try {
      // Authorization: Patients can only access their own readings
      if (req.user.role === "patient" && String(req.user.id) !== String(req.params.patientId)) {
        return res.status(403).json({ message: "Patients can only view their own readings" });
      }

      if (!(await canAccessPatient(req.user, req.params.patientId))) {
        return res.status(403).json({ message: "You cannot view this patient's readings" });
      }

      const limit = parseInt(req.query.limit) || 100;
      const records = await HealthReading.findAll({
        where: { patientId: req.params.patientId },
        order: [["createdAt", "DESC"]],
        limit,
      });
      // Return in chronological order (oldest first) for charts
      res.json(records.reverse());
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/device/readings/:patientId/latest — Get the most recent reading
// Doctors/Admins can get any patient's latest reading, Patients can get their own
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/readings/:patientId/latest",
  protect,
  async (req, res) => {
    try {
      // Authorization: Patients can only access their own latest reading
      if (req.user.role === "patient" && String(req.user.id) !== String(req.params.patientId)) {
        return res.status(403).json({ message: "Patients can only view their own latest reading" });
      }

      if (!(await canAccessPatient(req.user, req.params.patientId))) {
        return res.status(403).json({ message: "You cannot view this patient's readings" });
      }

      const latest = await HealthReading.findOne({
        where: { patientId: req.params.patientId },
        order: [["createdAt", "DESC"]],
      });
      res.json(latest);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/device/readings/:patientId/stats — Get summary statistics
// Doctors/Admins can get any patient's stats, Patients can get their own
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/readings/:patientId/stats",
  protect,
  async (req, res) => {
    try {
      // Authorization: Patients can only access their own stats
      if (req.user.role === "patient" && String(req.user.id) !== String(req.params.patientId)) {
        return res.status(403).json({ message: "Patients can only view their own stats" });
      }

      if (!(await canAccessPatient(req.user, req.params.patientId))) {
        return res.status(403).json({ message: "You cannot view this patient's stats" });
      }

      const patientId = req.params.patientId;
      const count = await HealthReading.count({ where: { patientId } });

      if (count === 0) {
        return res.json({ count: 0 });
      }

      const latest = await HealthReading.findOne({
        where: { patientId },
        order: [["createdAt", "DESC"]],
      });

      // Averages from last 50 records
      const recent = await HealthReading.findAll({
        where: { patientId },
        order: [["createdAt", "DESC"]],
        limit: 50,
      });

      const avg = (arr, key) => {
        const valid = arr
          .map((r) => r[key])
          .filter((v) => v != null && v > 0);
        return valid.length > 0
          ? +(valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1)
          : 0;
      };

      res.json({
        count,
        latest,
        averages: {
          pulse_rate: avg(recent, "pulse_rate"),
          spo2: avg(recent, "spo2"),
          body_temp: avg(recent, "body_temp"),
          env_temp: avg(recent, "env_temp"),
          humidity: avg(recent, "humidity"),
          bp_systolic: avg(recent, "bp_systolic"),
          bp_diastolic: avg(recent, "bp_diastolic"),
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
