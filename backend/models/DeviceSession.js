const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const DeviceSession = sequelize.define(
  "DeviceSession",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "ESP32-001",
      comment: "Identifier for the physical device",
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      comment: "Supervising doctor for the session; patient-started sessions use assigned/fallback doctor",
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "null = session is still active",
    },
    status: {
      type: DataTypes.ENUM("active", "completed"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    tableName: "device_sessions",
    timestamps: true,
    // ── Sessions cannot be deleted — audit trail is preserved ──
    hooks: {
      beforeDestroy: () => {
        throw new Error("Device sessions cannot be deleted. They serve as an audit trail.");
      },
    },
  }
);

module.exports = DeviceSession;
