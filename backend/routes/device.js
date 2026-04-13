const express = require("express");
const { Op } = require("sequelize");
const { User, DeviceSession, HealthReading } = require("../models");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

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
// POST /api/device/session/start — Doctor starts monitoring a patient
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/session/start",
  protect,
  authorize("doctor", "admin"),
  async (req, res) => {
    try {
      const { patientId, deviceId = "ESP32-001" } = req.body;

      if (!patientId) {
        return res.status(400).json({ message: "patientId is required" });
      }

      // Verify the patient exists
      const patient = await User.findOne({
        where: { id: patientId, role: "patient" },
      });
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

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
        doctorId: req.user.id,
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
// POST /api/device/session/stop — Doctor stops monitoring
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/session/stop",
  protect,
  authorize("doctor", "admin"),
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
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/session/active",
  protect,
  authorize("doctor", "admin"),
  async (req, res) => {
    try {
      const { deviceId = "ESP32-001" } = req.query;

      const session = await DeviceSession.findOne({
        where: {
          deviceId,
          status: "active",
          endedAt: null,
        },
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
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/readings/:patientId",
  protect,
  authorize("doctor", "admin"),
  async (req, res) => {
    try {
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
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/readings/:patientId/latest",
  protect,
  authorize("doctor", "admin"),
  async (req, res) => {
    try {
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
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/readings/:patientId/stats",
  protect,
  authorize("doctor", "admin"),
  async (req, res) => {
    try {
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
