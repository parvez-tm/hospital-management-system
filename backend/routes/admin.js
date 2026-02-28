const express = require("express");
const { User, Hospital, PatientVitals } = require("../models");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/admin/stats - Get overall stats for admin dashboard
router.get("/stats", protect, authorize("admin"), async (req, res) => {
  try {
    const totalHospitals = await Hospital.count();
    const activeHospitals = await Hospital.count({
      where: { isActive: true },
    });
    const totalDoctors = await User.count({ where: { role: "doctor" } });
    const totalPatients = await User.count({ where: { role: "patient" } });
    const totalRecords = await PatientVitals.count();

    res.json({
      totalHospitals,
      activeHospitals,
      totalDoctors,
      totalPatients,
      totalRecords,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/doctors - Get all doctors across all hospitals
router.get("/doctors", protect, authorize("admin"), async (req, res) => {
  try {
    const doctors = await User.findAll({
      where: { role: "doctor" },
      attributes: { exclude: ["password"] },
      include: [
        { model: Hospital, as: "hospital", attributes: ["name"] },
      ],
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/patients - Get all patients across all hospitals
router.get("/patients", protect, authorize("admin"), async (req, res) => {
  try {
    const patients = await User.findAll({
      where: { role: "patient" },
      attributes: { exclude: ["password"] },
      include: [
        { model: Hospital, as: "hospital", attributes: ["name"] },
      ],
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/admin/users/:id - Remove a user (admin only)
router.delete("/users/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Also delete related vitals if patient
    if (user.role === "patient") {
      await PatientVitals.destroy({ where: { patientId: user.id } });
    }
    if (user.role === "doctor") {
      await PatientVitals.destroy({ where: { doctorId: user.id } });
    }
    await user.destroy();
    res.json({ message: "User removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
