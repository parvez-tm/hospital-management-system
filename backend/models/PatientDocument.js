const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const PatientDocument = sequelize.define(
  "PatientDocument",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    uploaderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    uploaderRole: {
      type: DataTypes.ENUM("doctor", "patient"),
      allowNull: false,
    },
    originalName: { type: DataTypes.STRING, allowNull: false },
    mimeType: { type: DataTypes.STRING, allowNull: false },
    fileSize: { type: DataTypes.INTEGER, allowNull: false },
    fileData: { type: DataTypes.BLOB("long"), allowNull: false },
  },
  { tableName: "patient_documents", timestamps: true }
);

module.exports = PatientDocument;
