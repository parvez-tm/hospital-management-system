const express = require("express");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { User, Hospital } = require("../models");
const { protect } = require("../middleware/auth");

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      username,
      password,
      contactNo,
      role,
      hospitalId,
      age,
      height,
      weight,
      specialization,
    } = req.body;

    // Check if hospital exists (for non-admin users)
    if (role !== "admin") {
      const hospital = await Hospital.findByPk(hospitalId);
      if (!hospital) {
        return res.status(400).json({ message: "Hospital not found" });
      }
      if (!hospital.isActive) {
        return res
          .status(400)
          .json({ message: "Hospital is currently inactive" });
      }
    }

    // Check if user already exists in the same hospital
    const hId = role !== "admin" ? hospitalId : null;
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username, hospitalId: hId },
          { email, hospitalId: hId },
        ],
      },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists in this hospital" });
    }

    const user = await User.create({
      name,
      email,
      username,
      password,
      contactNo,
      role,
      hospitalId: role !== "admin" ? hospitalId : null,
      age: role === "patient" ? age : null,
      height: role === "patient" ? height : null,
      weight: role === "patient" ? weight : null,
      specialization: role === "doctor" ? specialization : null,
    });

    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      hospitalId: user.hospitalId,
      token: generateToken(user.id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password, hospitalId, role } = req.body;

    const where = { username };
    if (role !== "admin" && hospitalId) {
      where.hospitalId = hospitalId;
    }
    if (role) {
      where.role = role;
    }

    const user = await User.findOne({ where });

    if (user && (await user.matchPassword(password))) {
      const hospital = user.hospitalId
        ? await Hospital.findByPk(user.hospitalId)
        : null;

      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        hospitalId: user.hospitalId,
        hospitalName: hospital ? hospital.name : null,
        contactNo: user.contactNo,
        age: user.age,
        height: user.height,
        weight: user.weight,
        specialization: user.specialization,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Hospital,
          as: "hospital",
          attributes: ["name", "address", "phone", "email"],
        },
      ],
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
