const express = require("express");
const cors = require("cors");
const path = require("path");
const { Op, fn, col } = require("sequelize");
const sequelize = require("./config/database");
const HealthReading = require("./models/HealthReading");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ============ API Routes ============

// POST /api/health — Receive data from ESP32
app.post("/api/health", async (req, res) => {
  try {
    const reading = await HealthReading.create(req.body);

    console.log(`[${new Date().toLocaleTimeString()}] New reading saved:`, {
      id: reading.id,
      hr: reading.pulse_rate,
      spo2: reading.spo2,
      temp: reading.body_temp,
    });

    res.status(201).json({ success: true, id: reading.id });
  } catch (err) {
    console.error("Error saving reading:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/health — Return stored records
app.get("/api/health", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const records = await HealthReading.findAll({
      order: [["createdAt", "DESC"]],
      limit,
    });
    // Return in chronological order (oldest first) for charts
    res.json(records.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/health/latest — Return the most recent reading
app.get("/api/health/latest", async (req, res) => {
  try {
    const latest = await HealthReading.findOne({
      order: [["createdAt", "DESC"]],
    });
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/health/stats — Return summary statistics
app.get("/api/health/stats", async (req, res) => {
  try {
    const count = await HealthReading.count();

    if (count === 0) {
      return res.json({ count: 0 });
    }

    const latest = await HealthReading.findOne({
      order: [["createdAt", "DESC"]],
    });

    // Averages from last 50 records
    const recent = await HealthReading.findAll({
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/health — Clear all records
app.delete("/api/health", async (req, res) => {
  try {
    await HealthReading.destroy({ where: {}, truncate: true });
    res.json({ success: true, message: "All records cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve dashboard for any unmatched route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ============ Start Server ============
async function start() {
  try {
    // Test DB connection
    await sequelize.authenticate();
    console.log("  ✅ PostgreSQL connected");

    // Sync models (creates tables if they don't exist)
    await sequelize.sync();
    console.log("  ✅ Database synced\n");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`  ╔════════════════════════════════════════════╗`);
      console.log(`  ║   🏥  Health Monitor Server Running        ║`);
      console.log(`  ║                                            ║`);
      console.log(`  ║   Dashboard:  http://localhost:${PORT}        ║`);
      console.log(`  ║   API:        http://localhost:${PORT}/api    ║`);
      console.log(`  ║   Database:   PostgreSQL (Sequelize)       ║`);
      console.log(`  ║                                            ║`);
      console.log(`  ║   Waiting for ESP32 data...                ║`);
      console.log(`  ╚════════════════════════════════════════════╝\n`);
    });
  } catch (err) {
    console.error("\n  ❌ Unable to connect to PostgreSQL:", err.message);
    console.error('  Make sure PostgreSQL is running and the database "healthmon" exists.');
    console.error("  To create it, run:  createdb healthmon\n");
    process.exit(1);
  }
}

start();
