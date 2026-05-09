import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAdminStats } from "../../services/api";
import StatCard from "../../components/StatCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import { FiUsers, FiUser, FiActivity, FiClock } from "react-icons/fi";

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
        <h1 className="text-2xl font-bold text-gray-800">Hospital Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Manage doctors, patients, clinical records, and review queues.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Doctors"
          value={stats?.totalDoctors || 0}
          icon={<FiUsers />}
          color="teal"
        />
        <StatCard
          title="Patients"
          value={stats?.totalPatients || 0}
          icon={<FiUser />}
          color="blue"
        />
        <StatCard
          title="Vitals Records"
          value={stats?.totalRecords || 0}
          icon={<FiActivity />}
          color="orange"
        />
        <StatCard
          title="Pending Reviews"
          value={stats?.pendingReviews || 0}
          icon={<FiClock />}
          color="purple"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Hospital Overview</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span>Active doctor accounts</span>
              <span className="font-semibold text-gray-800">{stats?.totalDoctors || 0}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span>Registered patients</span>
              <span className="font-semibold text-gray-800">{stats?.totalPatients || 0}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span>Doctor review requests</span>
              <span className="font-semibold text-purple-600">{stats?.pendingReviews || 0}</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Clinical records</span>
              <span className="font-semibold text-gray-800">{stats?.totalRecords || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
          <p className="text-sm opacity-80 mb-4">
            Create accounts and keep the care team connected from one hospital admin console.
          </p>
          <div className="space-y-2">
            <Link
              to="/admin/doctors"
              className="block bg-white/10 hover:bg-white/20 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            >
              Manage Doctors
            </Link>
            <Link
              to="/admin/patients"
              className="block bg-white/10 hover:bg-white/20 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            >
              Manage Patients
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
