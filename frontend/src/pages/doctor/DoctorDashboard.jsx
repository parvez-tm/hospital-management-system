import { useState, useEffect } from "react";
import { getDoctorStats } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/StatCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import { formatBloodPressure, formatVital } from "../../utils/formatters";
import { FiClipboard, FiCalendar, FiClock, FiUsers, FiHeart, FiWind, FiThermometer } from "react-icons/fi";

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="My Patients"
          value={stats?.totalPatients || 0}
          icon={<FiUsers />}
          color="blue"
          subtitle="Assigned or engaged"
        />
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
        <StatCard
          title="Pending Reviews"
          value={stats?.pendingReviews || 0}
          icon={<FiClock />}
          color="purple"
          subtitle="Need prescription"
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

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Recent Patient Vitals</h3>
            <p className="text-xs text-gray-500 mt-1">Latest vital information, grouped by patient</p>
          </div>
          <a href="/doctor/patients" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
            View patients →
          </a>
        </div>
        {stats?.recentVitals?.length ? (
          <div className="space-y-3">
            {stats.recentVitals.map((vital) => (
              <div key={vital.id} className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-3 items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{vital.patient?.name || "Patient"}</p>
                  <p className="text-xs text-gray-500">{new Date(vital.createdAt).toLocaleString()}</p>
                </div>
                <span className="text-sm text-gray-700"><FiHeart className="inline text-red-500 mr-1" />BP {formatBloodPressure(vital.systolic, vital.diastolic)}</span>
                <span className="text-sm text-gray-700"><FiHeart className="inline text-pink-500 mr-1" />HR {formatVital(vital.pulse)} bpm</span>
                <span className="text-sm text-gray-700"><FiWind className="inline text-blue-500 mr-1" />SpO₂ {formatVital(vital.oxygen)}%</span>
                <span className="text-sm text-gray-700"><FiThermometer className="inline text-orange-500 mr-1" />{formatVital(vital.temperature)}°</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-5 text-center">No patient vitals recorded yet.</p>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;
