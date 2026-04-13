import axios from "axios";

const API = axios.create({
  // baseURL: "https://22glf3zb-5000.inc1.devtunnels.ms/api",
  baseURL: "http://localhost:5000/api",
});

// Attach token to every request
API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("userInfo") || "null");
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

// Auth
export const login = (data) => API.post("/auth/login", data);
export const register = (data) => API.post("/auth/register", data);
export const getMe = () => API.get("/auth/me");

// Hospitals (public)
export const getHospitals = () => API.get("/hospitals");

// Hospitals (admin)
export const getAllHospitals = () => API.get("/hospitals/all");
export const createHospital = (data) => API.post("/hospitals", data);
export const updateHospital = (id, data) => API.put(`/hospitals/${id}`, data);
export const toggleHospital = (id) => API.patch(`/hospitals/${id}/toggle`);

// Admin
export const getAdminStats = () => API.get("/admin/stats");
export const getAdminDoctors = () => API.get("/admin/doctors");
export const getAdminPatients = () => API.get("/admin/patients");
export const deleteUser = (id) => API.delete(`/admin/users/${id}`);

// Doctor
export const getDoctorStats = () => API.get("/doctor/stats");
export const getDoctorPatients = () => API.get("/doctor/patients");
export const getDoctorPatientDetail = (id) => API.get(`/doctor/patients/${id}`);
export const addPatientVitals = (data) => API.post("/doctor/vitals", data);

// Patient
export const getPatientProfile = () => API.get("/patient/profile");
export const updatePatientProfile = (data) => API.put("/patient/profile", data);
export const getPatientVitals = () => API.get("/patient/vitals");
export const getPatientVitalDetail = (id) => API.get(`/patient/vitals/${id}`);
export const getPatientStats = () => API.get("/patient/stats");

// Patient — Device Health Readings (own readings)
export const getMyHealthReadings = (limit) => API.get("/patient/health-readings", { params: { limit } });
export const getMyLatestReading = () => API.get("/patient/health-readings/latest");
export const getMyHealthStats = () => API.get("/patient/health-readings/stats");

// Device / ESP32
export const startDeviceSession = (data) => API.post("/device/session/start", data);
export const stopDeviceSession = (data) => API.post("/device/session/stop", data);
export const getActiveSession = (deviceId) => API.get("/device/session/active", { params: { deviceId } });
export const getDeviceReadings = (patientId, limit) => API.get(`/device/readings/${patientId}`, { params: { limit } });
export const getLatestReading = (patientId) => API.get(`/device/readings/${patientId}/latest`);
export const getReadingStats = (patientId) => API.get(`/device/readings/${patientId}/stats`);

export default API;
