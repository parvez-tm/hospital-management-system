require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sequelize, connectDB } = require("./config/db");

// Import models (this also sets up associations)
require("./models");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/doctor", require("./routes/doctor"));
app.use("/api/patient", require("./routes/patient"));
app.use("/api/admin", require("./routes/admin"));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Hospital Management API is running" });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  // Sync all models - use { alter: true } in dev to auto-update schema
  await sequelize.sync({ alter: true });
  console.log("All models synced with database");
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
