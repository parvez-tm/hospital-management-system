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
    hospitalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "hospitals",
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
    notes: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
  },
  {
    tableName: "patient_vitals",
    timestamps: true,
  }
);

module.exports = PatientVitals;
