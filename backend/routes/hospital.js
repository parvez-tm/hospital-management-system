const express = require("express");
const { Op } = require("sequelize");
const { Hospital, User } = require("../models");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/hospitals - Get all hospitals (public - for registration dropdown)
router.get("/", async (req, res) => {
  try {
    const hospitals = await Hospital.findAll({
      where: { isActive: true },
      attributes: ["id", "name", "address", "phone", "email"],
    });
    res.json(hospitals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/hospitals/all - Get all hospitals including inactive (admin only)
router.get("/all", protect, authorize("admin"), async (req, res) => {
  try {
    const hospitals = await Hospital.findAll();
    const hospitalsWithCounts = await Promise.all(
      hospitals.map(async (h) => {
        const doctorCount = await User.count({
          where: { hospitalId: h.id, role: "doctor" },
        });
        const patientCount = await User.count({
          where: { hospitalId: h.id, role: "patient" },
        });
        return {
          ...h.toJSON(),
          doctorCount,
          patientCount,
        };
      })
    );
    res.json(hospitalsWithCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/hospitals - Create hospital (admin only)
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { name, address, phone, email } = req.body;

    const existing = await Hospital.findOne({
      where: {
        [Op.or]: [{ name }, { email }],
      },
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Hospital with this name or email already exists" });
    }

    const hospital = await Hospital.create({ name, address, phone, email });
    res.status(201).json(hospital);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/hospitals/:id - Update hospital (admin only)
router.put("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const hospital = await Hospital.findByPk(req.params.id);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }
    await hospital.update(req.body);
    res.json(hospital);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/hospitals/:id/toggle - Toggle hospital active status (admin only)
router.patch(
  "/:id/toggle",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const hospital = await Hospital.findByPk(req.params.id);
      if (!hospital) {
        return res.status(404).json({ message: "Hospital not found" });
      }
      hospital.isActive = !hospital.isActive;
      await hospital.save();
      res.json(hospital);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/hospitals/:id/stats - Get hospital statistics
router.get("/:id/stats", protect, authorize("admin"), async (req, res) => {
  try {
    const hospitalId = req.params.id;
    const doctorCount = await User.count({
      where: { hospitalId, role: "doctor" },
    });
    const patientCount = await User.count({
      where: { hospitalId, role: "patient" },
    });
    res.json({ doctorCount, patientCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
