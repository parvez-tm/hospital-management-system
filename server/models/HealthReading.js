const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const HealthReading = sequelize.define(
  "HealthReading",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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
    },
    ntc_temp: {
      type: DataTypes.FLOAT,
      allowNull: true,
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
      comment: "ISO timestamp from ESP32",
    },
  },
  {
    tableName: "health_readings",
    timestamps: true, // adds createdAt and updatedAt
  }
);

module.exports = HealthReading;
