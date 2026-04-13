import { useState, useEffect } from "react";
import { getAdminStats } from "../../services/api";
import StatCard from "../../components/StatCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import { FaHospital } from "react-icons/fa";
import { FiUsers, FiUser, FiActivity, FiCheckCircle } from "react-icons/fi";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getAdminStats();
        setStats(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of the entire system</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        <StatCard
          title="Total Hospitals"
          value={stats?.totalHospitals || 0}
          icon={<FaHospital />}
          color="purple"
        />
        <StatCard
          title="Active Hospitals"
          value={stats?.activeHospitals || 0}
          icon={<FiCheckCircle />}
          color="green"
        />
        <StatCard
          title="Total Doctors"
          value={stats?.totalDoctors || 0}
          icon={<FiUsers />}
          color="teal"
        />
        <StatCard
          title="Total Patients"
          value={stats?.totalPatients || 0}
          icon={<FiUser />}
          color="blue"
        />
        <StatCard
          title="Total Records"
          value={stats?.totalRecords || 0}
          icon={<FiActivity />}
          color="orange"
        />
      </div>

      {/* Quick info cards */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">System Overview</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span>Hospitals Registered</span>
              <span className="font-semibold text-gray-800">{stats?.totalHospitals}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span>Currently Active</span>
              <span className="font-semibold text-green-600">{stats?.activeHospitals}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span>Currently Inactive</span>
              <span className="font-semibold text-red-600">
                {(stats?.totalHospitals || 0) - (stats?.activeHospitals || 0)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span>Vitals Records</span>
              <span className="font-semibold text-gray-800">{stats?.totalRecords}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
          <p className="text-sm opacity-80 mb-4">
            Manage hospitals, view doctors and patients across the entire system.
          </p>
          <div className="space-y-2">
            {/* <a
              href="/admin/hospitals"
              className="block bg-white/10 hover:bg-white/20 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            >
              → Manage Hospitals
            </a> */}
            <a
              href="/admin/doctors"
              className="block bg-white/10 hover:bg-white/20 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            >
              → View All Doctors
            </a>
            <a
              href="/admin/patients"
              className="block bg-white/10 hover:bg-white/20 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            >
              → View All Patients
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
