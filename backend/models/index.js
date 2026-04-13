const User = require("./User");
const PatientVitals = require("./PatientVitals");

// --- Associations ---


// User (doctor) can be assigned to patients
User.hasMany(User, { foreignKey: "assignedDoctor", as: "patients" });
User.belongsTo(User, { foreignKey: "assignedDoctor", as: "doctor" });

// PatientVitals belongs to a patient, doctor, and hospital
PatientVitals.belongsTo(User, { foreignKey: "patientId", as: "patient" });
PatientVitals.belongsTo(User, { foreignKey: "doctorId", as: "doctorInfo" });

User.hasMany(PatientVitals, { foreignKey: "patientId", as: "patientVitals" });
User.hasMany(PatientVitals, { foreignKey: "doctorId", as: "doctorVitals" });

module.exports = { User, PatientVitals };
