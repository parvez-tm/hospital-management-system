const express = require("express");
const { fn, col } = require("sequelize");
const { User, PatientVitals } = require("../models");
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
        attributes: { exclude: ["password"] }
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
      const { name, contactNo, age, height, weight } = req.body;
      await User.update(
        { name, contactNo, age, height, weight },
        { where: { id: req.user.id } }
      );
      const patient = await User.findByPk(req.user.id, {
        attributes: { exclude: ["password"] },
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

module.exports = router;
