const express = require("express");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { User } = require("../models");
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
      age,
      height,
      weight,
      specialization,
    } = req.body;


    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email },
        ],
      },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      email,
      username,
      password,
      contactNo,
      role,
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
      token: generateToken(user.id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    console.log(req.body);
    
    const where = { username };
    if (role) {
      where.role = role;
    }
 
    const user = await User.findOne({ where });
    console.log(user,"asd");
    

    if (user && (await user.matchPassword(password))) {
      
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
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
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
