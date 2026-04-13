const express = require("express");
const { Op } = require("sequelize");
const { User, PatientVitals } = require("../models");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/doctor/patients - Get all patients for this doctor's hospital
router.get(
  "/patients",
  protect,
  authorize("doctor"),
  async (req, res) => {
    try {
      const patients = await User.findAll({
        where: {
          role: "patient",
        },
        attributes: { exclude: ["password"] },
      });
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/doctor/patients/:id - Get single patient details with vitals
router.get(
  "/patients/:id",
  protect,
  authorize("doctor"),
  async (req, res) => {
    try {
      const patient = await User.findOne({
        where: {
          id: req.params.id,
          role: "patient",
        },
        attributes: { exclude: ["password"] },
      });

      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      const vitals = await PatientVitals.findAll({
        where: {
          patientId: req.params.id,
        },
        include: [
          {
            model: User,
            as: "doctorInfo",
            attributes: ["name"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      res.json({ patient, vitals });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/doctor/vitals - Add vitals/prescription for a patient
router.post(
  "/vitals",
  protect,
  authorize("doctor"),
  async (req, res) => {
    try {
      const {
        patientId,
        systolic,
        diastolic,
        pulse,
        oxygen,
        temperature,
        prescription,
        notes,
      } = req.body;

      // Verify patient belongs to same hospital
      const patient = await User.findOne({
        where: {
          id: patientId,
          role: "patient",
        },
      });

      if (!patient) {
        return res
          .status(404)
          .json({ message: "Patient not found in your hospital" });
      }

      const vitals = await PatientVitals.create({
        patientId,
        doctorId: req.user.id,
        systolic,
        diastolic,
        pulse,
        oxygen,
        temperature,
        prescription,
        notes,
      });

      const populatedVitals = await PatientVitals.findByPk(vitals.id, {
        include: [
          { model: User, as: "doctorInfo", attributes: ["name"] },
          { model: User, as: "patient", attributes: ["name"] },
        ],
      });

      res.status(201).json(populatedVitals);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/doctor/stats - Get doctor dashboard stats
router.get(
  "/stats",
  protect,
  authorize("doctor"),
  async (req, res) => {
    try {
      const totalPatients = await User.count({
        where: {
          role: "patient",
        },
      });

      const totalRecords = await PatientVitals.count({
        where: {
          doctorId: req.user.id,
        },
      });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayRecords = await PatientVitals.count({
        where: {
          doctorId: req.user.id,
          createdAt: { [Op.gte]: todayStart },
        },
      });

      res.json({ totalPatients, totalRecords, todayRecords });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
