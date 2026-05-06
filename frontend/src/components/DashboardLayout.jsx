import { useState } from "react";
import { Link, useNavigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiHome,
  FiUsers,
  FiActivity,
  FiLogOut,
  FiMenu,
  FiX,
  FiUser,
  FiHeart,
  FiClipboard,
} from "react-icons/fi";
import { FaHospital } from "react-icons/fa";

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getNavItems = () => {
    if (user?.role === "admin") {
      return [
        { to: "/admin", icon: <FiHome />, label: "Dashboard" },
        // { to: "/admin/hospitals", icon: <FaHospital />, label: "Hospitals" },
        { to: "/admin/doctors", icon: <FiUsers />, label: "Doctors" },
        { to: "/admin/patients", icon: <FiUser />, label: "Patients" },
      ];
    }
    if (user?.role === "doctor") {
      return [
        { to: "/doctor", icon: <FiHome />, label: "Dashboard" },
        { to: "/doctor/patients", icon: <FiUsers />, label: "My Patients" },
      ];
    }
    if (user?.role === "patient") {
      return [
        { to: "/patient", icon: <FiHome />, label: "Dashboard" },
        { to: "/patient/device-readings", icon: <FiActivity />, label: "Device Readings" },
        { to: "/patient/profile", icon: <FiUser />, label: "My Profile" },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  const roleColors = {
    admin: "from-purple-700 to-indigo-800",
    doctor: "from-teal-600 to-cyan-700",
    patient: "from-blue-600 to-blue-800",
  };

  const roleBadgeColors = {
    admin: "bg-purple-200 text-purple-800",
    doctor: "bg-teal-200 text-teal-800",
    patient: "bg-blue-200 text-blue-800",
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b ${
          roleColors[user?.role] || "from-gray-700 to-gray-900"
        } text-white transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center gap-3">
            <FiActivity className="text-2xl" />
            <div>
              <h1 className="text-lg font-bold">MediCare HMS</h1>
              <p className="text-xs opacity-75">Hospital Management</p>
            </div>
          </div>
          <button
            className="lg:hidden text-white hover:text-gray-300"
            onClick={() => setSidebarOpen(false)}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  roleBadgeColors[user?.role]
                }`}
              >
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </span>
            </div>
          </div>
          {user?.hospitalName && (
            <p className="text-xs mt-2 opacity-75 flex items-center gap-1">
              <FaHospital /> {user.hospitalName}
            </p>
          )}
        </div>

        {/* Nav items */}
        <nav className="p-4 space-y-1 flex-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to !== `/${user?.role}` &&
                location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white/20 text-white shadow-lg"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/20">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/70 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200 w-full"
          >
            <FiLogOut className="text-lg" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <button
            className="lg:hidden text-gray-600 hover:text-gray-900"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <FiClipboard className="text-gray-400" />
            <span className="text-sm text-gray-500">
              {location.pathname
                .split("/")
                .filter(Boolean)
                .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                .join(" > ")}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">
              Welcome, <span className="font-semibold">{user?.name}</span>
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
