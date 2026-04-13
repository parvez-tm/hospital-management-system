import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AdminLogin from "./pages/auth/AdminLogin";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageHospitals from "./pages/admin/ManageHospitals";
import AdminDoctors from "./pages/admin/AdminDoctors";
import AdminPatients from "./pages/admin/AdminPatients";

// Doctor pages
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorPatients from "./pages/doctor/DoctorPatients";
import PatientDetail from "./pages/doctor/PatientDetail";

// Patient pages
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientVitals from "./pages/patient/PatientVitals";
import PatientProfile from "./pages/patient/PatientProfile";
import PatientDeviceReadings from "./pages/patient/PatientDeviceReadings";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          theme="colored"
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/system/auth" element={<AdminLogin />} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="hospitals" element={<ManageHospitals />} />
            <Route path="doctors" element={<AdminDoctors />} />
            <Route path="patients" element={<AdminPatients />} />
          </Route>

          {/* Doctor routes */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute roles={["doctor"]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DoctorDashboard />} />
            <Route path="patients" element={<DoctorPatients />} />
            <Route path="patients/:id" element={<PatientDetail />} />
          </Route>

          {/* Patient routes */}
          <Route
            path="/patient"
            element={
              <ProtectedRoute roles={["patient"]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PatientDashboard />} />
            <Route path="vitals" element={<PatientVitals />} />
            <Route path="device-readings" element={<PatientDeviceReadings />} />
            <Route path="profile" element={<PatientProfile />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
