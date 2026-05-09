const express = require("express");
const { fn, col, Op } = require("sequelize");
const { User, PatientVitals, HealthReading } = require("../models");
const { protect, authorize, tenantIsolation } = require("../middleware/auth");

const router = express.Router();

// GET /api/patient/profile - Get patient's own profile
router.get(
  "/profile",
  protect,
  authorize("patient"),
  tenantIsolation,
  async (req, res) => {
    try {
      const patient = await User.findByPk(req.user.id, {
        attributes: { exclude: ["password"] },
        include: [
          {
            model: User,
            as: "doctor",
            attributes: ["id", "name", "specialization"],
          },
        ],
      });
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// PUT /api/patient/profile - Update patient's own profile
router.put(
  "/profile",
  protect,
  authorize("patient"),
  tenantIsolation,
  async (req, res) => {
    try {
      const { name, contactNo, age, height, weight, disease } = req.body;
      await User.update(
        { name, contactNo, age, height, weight, disease },
        { where: { id: req.user.id } }
      );
      const patient = await User.findByPk(req.user.id, {
        attributes: { exclude: ["password"] },
        include: [
          {
            model: User,
            as: "doctor",
            attributes: ["id", "name", "specialization"],
          },
        ],
      });
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/patient/vitals - Get patient's own vitals history
router.get(
  "/vitals",
  protect,
  authorize("patient"),
  tenantIsolation,
  async (req, res) => {
    try {
      const vitals = await PatientVitals.findAll({
        where: {
          patientId: req.user.id
        },
        include: [
          {
            model: User,
            as: "doctorInfo",
            attributes: ["name", "specialization"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      res.json(vitals);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/patient/vitals/:id - Get single vitals record
router.get(
  "/vitals/:id",
  protect,
  authorize("patient"),
  tenantIsolation,
  async (req, res) => {
    try {
      const vital = await PatientVitals.findOne({
        where: {
          id: req.params.id,
          patientId: req.user.id,
        },
        include: [
          {
            model: User,
            as: "doctorInfo",
            attributes: ["name", "specialization"],
          }
        ],
      });
      if (!vital) {
        return res.status(404).json({ message: "Record not found" });
      }
      res.json(vital);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/patient/stats - Get patient dashboard stats
router.get(
  "/stats",
  protect,
  authorize("patient"),
  tenantIsolation,
  async (req, res) => {
    try {
      const totalVisits = await PatientVitals.count({
        where: {
          patientId: req.user.id,
        },
      });

      const latestVitals = await PatientVitals.findOne({
        where: {
          patientId: req.user.id,
          [Op.or]: [
            { reviewStatus: "reviewed" },
            { submittedBy: "doctor" },
          ],
        },
        order: [["createdAt", "DESC"]],
        include: [
          { model: User, as: "doctorInfo", attributes: ["name"] },
        ],
      });

      // Count distinct doctors
      const doctorRows = await PatientVitals.findAll({
        where: {
          patientId: req.user.id,
        },
        attributes: [[fn("DISTINCT", col("doctorId")), "doctorId"]],
        raw: true,
      });

      res.json({
        totalVisits,
        latestVitals,
        totalDoctors: doctorRows.length,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Device Health Readings — Patient can view their own ESP32 sensor readings
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/patient/health-readings - Get patient's own device readings
router.get(
  "/health-readings",
  protect,
  authorize("patient"),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const readings = await HealthReading.findAll({
        where: { patientId: req.user.id },
        order: [["createdAt", "DESC"]],
        limit,
      });
      // Return in chronological order (oldest first) for charts
      res.json(readings.reverse());
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/patient/health-readings/latest - Get most recent device reading
router.get(
  "/health-readings/latest",
  protect,
  authorize("patient"),
  async (req, res) => {
    try {
      const latest = await HealthReading.findOne({
        where: { patientId: req.user.id },
        order: [["createdAt", "DESC"]],
      });
      res.json(latest);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/patient/health-readings/stats - Get device reading statistics
router.get(
  "/health-readings/stats",
  protect,
  authorize("patient"),
  async (req, res) => {
    try {
      const count = await HealthReading.count({
        where: { patientId: req.user.id },
      });

      if (count === 0) {
        return res.json({ count: 0 });
      }

      const latest = await HealthReading.findOne({
        where: { patientId: req.user.id },
        order: [["createdAt", "DESC"]],
      });

      const recent = await HealthReading.findAll({
        where: { patientId: req.user.id },
        order: [["createdAt", "DESC"]],
        limit: 50,
      });

      const avg = (arr, key) => {
        const valid = arr.map((r) => r[key]).filter((v) => v != null && v > 0);
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
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/patient/doctors - Get assigned doctor first, fallback to all doctors
router.get(
  "/doctors",
  protect,
  authorize("patient"),
  async (req, res) => {
    try {
      const patient = await User.findByPk(req.user.id, {
        attributes: ["assignedDoctor"],
      });

      if (patient?.assignedDoctor) {
        const assignedDoctor = await User.findOne({
          where: { id: patient.assignedDoctor, role: "doctor" },
          attributes: ["id", "name", "specialization"],
        });

        return res.json(assignedDoctor ? [assignedDoctor] : []);
      }

      const doctors = await User.findAll({
        where: { role: "doctor" },
        attributes: ["id", "name", "specialization"],
        order: [["name", "ASC"]],
      });
      res.json(doctors);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/patient/vitals - Patient submits their own vitals for doctor review
router.post(
  "/vitals",
  protect,
  authorize("patient"),
  async (req, res) => {
    try {
      let {
        systolic,
        diastolic,
        pulse,
        oxygen,
        temperature,
        notes,
        doctorId,
      } = req.body;
      const patient = await User.findByPk(req.user.id, {
        attributes: ["assignedDoctor"],
      });

      doctorId = doctorId || patient?.assignedDoctor;

      if (!doctorId) {
        return res.status(400).json({ message: "Please select a doctor for review" });
      }

      if (patient?.assignedDoctor && String(patient.assignedDoctor) !== String(doctorId)) {
        return res.status(403).json({ message: "You can only submit review requests to your assigned doctor" });
      }

      const doctor = await User.findOne({
        where: { id: doctorId, role: "doctor" },
      });

      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }

      const existingPending = await PatientVitals.findOne({
        where: {
          patientId: req.user.id,
          doctorId,
          reviewStatus: "pending",
        },
        order: [["createdAt", "DESC"]],
      });

      if (existingPending) {
        return res.status(409).json({ message: "You already have a pending review request with this doctor" });
      }

      const vitals = await PatientVitals.create({
        patientId: req.user.id,
        doctorId,
        systolic,
        diastolic,
        pulse,
        oxygen,
        temperature,
        prescription: "", // Empty to represent "Pending Review"
        patientNotes: notes || "",
        notes: "",
        submittedBy: "patient",
        reviewStatus: "pending",
      });

      res.status(201).json(vitals);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
