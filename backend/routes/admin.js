const express = require("express");
const { Op } = require("sequelize");
const { User, PatientVitals } = require("../models");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

const safeUserAttributes = { exclude: ["password"] };

const ensureUniqueUser = async (username, email) => {
  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ username }, { email }],
    },
  });

  if (existingUser) {
    const field = existingUser.username === username ? "username" : "email";
    const error = new Error(`A user with this ${field} already exists`);
    error.statusCode = 400;
    throw error;
  }
};

const handleAdminError = (res, error) => {
  res.status(error.statusCode || 500).json({ message: error.message });
};

// GET /api/admin/stats - Get overall stats for admin dashboard
router.get("/stats", protect, authorize("admin"), async (req, res) => {
  try {

    const totalDoctors = await User.count({ where: { role: "doctor" } });
    const totalPatients = await User.count({ where: { role: "patient" } });
    const totalRecords = await PatientVitals.count();
    const pendingReviews = await PatientVitals.count({
      where: {
        prescription: "",
        notes: { [Op.ne]: "" },
      },
    });

    res.json({
      totalDoctors,
      totalPatients,
      totalRecords,
      pendingReviews,
    });
  } catch (error) {
    handleAdminError(res, error);
  }
});

// GET /api/admin/doctors - Get all doctors
router.get("/doctors", protect, authorize("admin"), async (req, res) => {
  try {
    const doctors = await User.findAll({
      where: { role: "doctor" },
      attributes: safeUserAttributes,
      order: [["createdAt", "DESC"]],
    });
    res.json(doctors);
  } catch (error) {
    handleAdminError(res, error);
  }
});

// POST /api/admin/doctors - Create a doctor account
router.post("/doctors", protect, authorize("admin"), async (req, res) => {
  try {
    const { name, email, username, password, contactNo, specialization } = req.body;

    if (!name || !email || !username || !password || !contactNo) {
      return res.status(400).json({ message: "Name, email, username, password, and contact number are required" });
    }

    await ensureUniqueUser(username, email);

    const doctor = await User.create({
      name,
      email,
      username,
      password,
      contactNo,
      role: "doctor",
      specialization: specialization || "General",
    });

    const createdDoctor = await User.findByPk(doctor.id, {
      attributes: safeUserAttributes,
    });

    res.status(201).json(createdDoctor);
  } catch (error) {
    handleAdminError(res, error);
  }
});

// GET /api/admin/patients - Get all patients
router.get("/patients", protect, authorize("admin"), async (req, res) => {
  try {
    const patients = await User.findAll({
      where: { role: "patient" },
      attributes: safeUserAttributes,
      include: [
        {
          model: User,
          as: "doctor",
          attributes: ["id", "name", "specialization"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(patients);
  } catch (error) {
    handleAdminError(res, error);
  }
});

// POST /api/admin/patients - Create a patient account
router.post("/patients", protect, authorize("admin"), async (req, res) => {
  try {
    const {
      name,
      email,
      username,
      password,
      contactNo,
      age,
      height,
      weight,
      disease,
      assignedDoctor,
    } = req.body;

    if (!name || !email || !username || !password || !contactNo) {
      return res.status(400).json({ message: "Name, email, username, password, and contact number are required" });
    }

    if (assignedDoctor) {
      const doctor = await User.findOne({
        where: { id: assignedDoctor, role: "doctor" },
      });

      if (!doctor) {
        return res.status(400).json({ message: "Assigned doctor was not found" });
      }
    }

    await ensureUniqueUser(username, email);

    const patient = await User.create({
      name,
      email,
      username,
      password,
      contactNo,
      role: "patient",
      age: age || null,
      height: height || null,
      weight: weight || null,
      disease: disease || null,
      assignedDoctor: assignedDoctor || null,
    });

    const createdPatient = await User.findByPk(patient.id, {
      attributes: safeUserAttributes,
      include: [
        {
          model: User,
          as: "doctor",
          attributes: ["id", "name", "specialization"],
        },
      ],
    });

    res.status(201).json(createdPatient);
  } catch (error) {
    handleAdminError(res, error);
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
    handleAdminError(res, error);
  }
});

module.exports = router;
