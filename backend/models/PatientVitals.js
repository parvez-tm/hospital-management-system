const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const PatientVitals = sequelize.define(
  "PatientVitals",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
    },
    systolic: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    diastolic: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    pulse: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    oxygen: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    temperature: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    prescription: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
    patientNotes: {
      type: DataTypes.TEXT,
      defaultValue: "",
      comment: "Symptoms or request notes submitted by the patient",
    },
    notes: {
      type: DataTypes.TEXT,
      defaultValue: "",
      comment: "Doctor advice, follow-up instructions, or clinical notes",
    },
    submittedBy: {
      type: DataTypes.ENUM("doctor", "patient"),
      allowNull: false,
      defaultValue: "doctor",
    },
    reviewStatus: {
      type: DataTypes.ENUM("pending", "reviewed"),
      allowNull: false,
      defaultValue: "reviewed",
    },
  },
  {
    tableName: "patient_vitals",
    timestamps: true,
  }
);

module.exports = PatientVitals;
