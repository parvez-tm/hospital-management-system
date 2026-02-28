const Hospital = require("./Hospital");
const User = require("./User");
const PatientVitals = require("./PatientVitals");

// --- Associations ---

// Hospital has many Users
Hospital.hasMany(User, { foreignKey: "hospitalId", as: "users" });
User.belongsTo(Hospital, { foreignKey: "hospitalId", as: "hospital" });

// User (doctor) can be assigned to patients
User.hasMany(User, { foreignKey: "assignedDoctor", as: "patients" });
User.belongsTo(User, { foreignKey: "assignedDoctor", as: "doctor" });

// PatientVitals belongs to a patient, doctor, and hospital
PatientVitals.belongsTo(User, { foreignKey: "patientId", as: "patient" });
PatientVitals.belongsTo(User, { foreignKey: "doctorId", as: "doctorInfo" });
PatientVitals.belongsTo(Hospital, { foreignKey: "hospitalId", as: "hospital" });

User.hasMany(PatientVitals, { foreignKey: "patientId", as: "patientVitals" });
User.hasMany(PatientVitals, { foreignKey: "doctorId", as: "doctorVitals" });
Hospital.hasMany(PatientVitals, { foreignKey: "hospitalId", as: "vitals" });

module.exports = { Hospital, User, PatientVitals };
