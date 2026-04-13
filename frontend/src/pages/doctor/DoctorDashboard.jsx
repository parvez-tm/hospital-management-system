import { useState, useEffect } from "react";
import { getDoctorStats } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/StatCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import {  FiClipboard, FiCalendar } from "react-icons/fi";

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getDoctorStats();
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
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome, Dr. {user?.name} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {user?.specialization || "General Practice"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

        <StatCard
          title="Your Total Records"
          value={stats?.totalRecords || 0}
          icon={<FiClipboard />}
          color="teal"
          subtitle="Vitals added by you"
        />
        <StatCard
          title="Today's Records"
          value={stats?.todayRecords || 0}
          icon={<FiCalendar />}
          color="orange"
          subtitle="Added today"
        />
      </div>

      <div className="mt-8 bg-gradient-to-br from-teal-600 to-cyan-700 rounded-xl shadow-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
        <p className="text-sm opacity-80 mb-4">
          View your patients list or add vitals for a patient.
        </p>
        <a
          href="/doctor/patients"
          className="inline-block bg-white/10 hover:bg-white/20 rounded-lg px-6 py-3 text-sm font-medium transition-colors"
        >
          → View My Patients
        </a>
      </div>
    </div>
  );
};

export default DoctorDashboard;
