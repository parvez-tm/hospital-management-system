const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const HealthReading = sequelize.define(
  "HealthReading",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      comment: "The patient this reading belongs to (set via active session)",
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "device_sessions",
        key: "id",
      },
      comment: "The device session during which this reading was captured",
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "ESP32-001",
      comment: "Identifier for the physical device that sent this reading",
    },
    pulse_rate: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    spo2: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    body_temp: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Approximate body temp from MAX30102 die sensor + calibration offset",
    },
    env_temp: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    humidity: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    bp_systolic: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bp_diastolic: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ISO timestamp from ESP32 NTP clock",
    },
  },
  {
    tableName: "health_readings",
    timestamps: true,
    // ── Immutable: health readings cannot be edited or deleted ──
    hooks: {
      beforeUpdate: () => {
        throw new Error("Health readings are immutable and cannot be modified.");
      },
      beforeDestroy: () => {
        throw new Error("Health readings are immutable and cannot be deleted.");
      },
    },
  }
);

module.exports = HealthReading;
