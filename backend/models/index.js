const User = require("./User");
const PatientVitals = require("./PatientVitals");
const DeviceSession = require("./DeviceSession");
const HealthReading = require("./HealthReading");

// --- Associations ---

// User (doctor) can be assigned to patients
User.hasMany(User, { foreignKey: "assignedDoctor", as: "patients" });
User.belongsTo(User, { foreignKey: "assignedDoctor", as: "doctor" });

// PatientVitals belongs to a patient, doctor, and hospital
PatientVitals.belongsTo(User, { foreignKey: "patientId", as: "patient" });
PatientVitals.belongsTo(User, { foreignKey: "doctorId", as: "doctorInfo" });

User.hasMany(PatientVitals, { foreignKey: "patientId", as: "patientVitals" });
User.hasMany(PatientVitals, { foreignKey: "doctorId", as: "doctorVitals" });

// --- Device Session associations ---
DeviceSession.belongsTo(User, { foreignKey: "patientId", as: "patient" });
DeviceSession.belongsTo(User, { foreignKey: "doctorId", as: "sessionDoctor" });
User.hasMany(DeviceSession, { foreignKey: "patientId", as: "deviceSessions" });

// --- Health Reading associations ---
HealthReading.belongsTo(User, { foreignKey: "patientId", as: "readingPatient" });
HealthReading.belongsTo(DeviceSession, { foreignKey: "sessionId", as: "session" });
User.hasMany(HealthReading, { foreignKey: "patientId", as: "healthReadings" });
DeviceSession.hasMany(HealthReading, { foreignKey: "sessionId", as: "readings" });

module.exports = { User, PatientVitals, DeviceSession, HealthReading };
