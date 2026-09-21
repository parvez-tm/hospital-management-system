import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getPatientProfile,
  getPatientStats,
  getMyLatestReading,
  updatePatientProfile,
} from "../../services/api";
import StatCard from "../../components/StatCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import PatientDocuments from "../../components/PatientDocuments";
import { formatBloodPressure, formatVital } from "../../utils/formatters";
import { toast } from "react-toastify";
import {
  FiCalendar,
  FiUsers,
  FiHeart,
  FiThermometer,
  FiWind,
  FiActivity,
  FiRadio,
  FiSave,
  FiFileText,
} from "react-icons/fi";

const PatientDashboard = () => {
  const { user, loginUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [latestDevice, setLatestDevice] = useState(null);
  const [ongoingMedicine, setOngoingMedicine] = useState("");
  const [savingMedicine, setSavingMedicine] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, deviceRes, profileRes] = await Promise.all([
          getPatientStats(),
          getMyLatestReading(),
          getPatientProfile(),
        ]);
        setStats(statsRes.data);
        setLatestDevice(deviceRes.data);
        setOngoingMedicine(profileRes.data.ongoingMedicine || "");
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner />;

  const lv = stats?.latestVitals;

  const handleSaveMedicine = async (event) => {
    event.preventDefault();
    setSavingMedicine(true);
    try {
      const { data } = await updatePatientProfile({ ongoingMedicine });
      loginUser({ ...user, ongoingMedicine: data.ongoingMedicine || "" });
      toast.success("Ongoing medicines updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update medicines");
    } finally {
      setSavingMedicine(false);
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome, {user?.name} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Your health dashboard
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <StatCard
          title="Total Visits"
          value={stats?.totalVisits || 0}
          icon={<FiCalendar />}
          color="blue"
          subtitle="Recorded checkups"
        />
        <StatCard
          title="Doctors Seen"
          value={stats?.totalDoctors || 0}
          icon={<FiUsers />}
          color="teal"
          subtitle="Different doctors"
        />
        <StatCard
          title="Latest BP"
          value={lv ? formatBloodPressure(lv.systolic, lv.diastolic) : "N/A"}
          icon={<FiHeart />}
          color="red"
          subtitle="Blood pressure"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            My Information
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-gray-800">{user?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-gray-800">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Contact</span>
              <span className="font-medium text-gray-800">
                {user?.contactNo}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Age</span>
              <span className="font-medium text-gray-800">
                {user?.age || "N/A"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Height</span>
              <span className="font-medium text-gray-800">
                {user?.height || "N/A"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Weight</span>
              <span className="font-medium text-gray-800">
                {user?.weight || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Latest Vitals (Manual) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Latest Vitals
          </h3>
          {lv ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <FiHeart className="mx-auto text-red-500 text-xl mb-1" />
                  <p className="text-xs text-gray-500">Blood Pressure</p>
                  <p className="text-lg font-bold text-gray-800">
                    {formatBloodPressure(lv.systolic, lv.diastolic)}
                  </p>
                  <p className="text-xs text-gray-400">mmHg</p>
                </div>
                <div className="text-center p-4 bg-pink-50 rounded-xl">
                  <FiHeart className="mx-auto text-pink-500 text-xl mb-1" />
                  <p className="text-xs text-gray-500">Pulse</p>
                  <p className="text-lg font-bold text-gray-800">{formatVital(lv.pulse)}</p>
                  <p className="text-xs text-gray-400">bpm</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <FiWind className="mx-auto text-blue-500 text-xl mb-1" />
                  <p className="text-xs text-gray-500">Oxygen</p>
                  <p className="text-lg font-bold text-gray-800">
                    {formatVital(lv.oxygen)}%
                  </p>
                  <p className="text-xs text-gray-400">SpO₂</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-xl">
                  <FiThermometer className="mx-auto text-orange-500 text-xl mb-1" />
                  <p className="text-xs text-gray-500">Temperature</p>
                  <p className="text-lg font-bold text-gray-800">
                    {lv.temperature}°F
                  </p>
                  <p className="text-xs text-gray-400">Body temp</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Recorded on{" "}
                {new Date(lv.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                {lv.doctorInfo && ` by Dr. ${lv.doctorInfo.name}`}
              </p>
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <FiHeart className="text-4xl mx-auto mb-2 opacity-50" />
              <p>No vitals recorded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Latest Device Reading */}
      {latestDevice && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FiRadio className="text-emerald-500" />
              <h3 className="text-lg font-semibold text-gray-800">
                Latest Device Reading
              </h3>
              <span className="text-xs text-gray-400">
                {timeAgo(latestDevice.createdAt)}
              </span>
            </div>
            <a
              href="/patient/device-readings"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all →
            </a>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <div className="text-center p-3 bg-red-50 rounded-xl">
              <FiHeart className="mx-auto text-red-500 mb-1" size={16} />
              <p className="text-xs text-gray-500">HR</p>
              <p className="text-lg font-bold text-gray-800">
                 {formatVital(latestDevice.pulse_rate)}
              </p>
              <p className="text-xs text-gray-400">bpm</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <FiWind className="mx-auto text-blue-500 mb-1" size={16} />
              <p className="text-xs text-gray-500">SpO₂</p>
              <p className="text-lg font-bold text-gray-800">
                 {formatVital(latestDevice.spo2)}
              </p>
              <p className="text-xs text-gray-400">%</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-xl">
              <FiThermometer
                className="mx-auto text-orange-500 mb-1"
                size={16}
              />
              <p className="text-xs text-gray-500">Body</p>
              <p className="text-lg font-bold text-gray-800">
                {latestDevice.body_temp
                  ? latestDevice.body_temp.toFixed(1)
                  : "—"}
              </p>
              <p className="text-xs text-gray-400">°C</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <FiActivity
                className="mx-auto text-purple-500 mb-1"
                size={16}
              />
              <p className="text-xs text-gray-500">BP</p>
              <p className="text-lg font-bold text-gray-800">
                 {formatBloodPressure(latestDevice.bp_systolic, latestDevice.bp_diastolic)}
              </p>
              <p className="text-xs text-gray-400">mmHg</p>
            </div>
            <div className="text-center p-3 bg-teal-50 rounded-xl">
              <FiThermometer
                className="mx-auto text-teal-500 mb-1"
                size={16}
              />
              <p className="text-xs text-gray-500">Room</p>
              <p className="text-lg font-bold text-gray-800">
                {latestDevice.env_temp
                  ? latestDevice.env_temp.toFixed(1)
                  : "—"}
              </p>
              <p className="text-xs text-gray-400">°C</p>
            </div>
            <div className="text-center p-3 bg-sky-50 rounded-xl">
              <FiWind className="mx-auto text-sky-500 mb-1" size={16} />
              <p className="text-xs text-gray-500">Humidity</p>
              <p className="text-lg font-bold text-gray-800">
                {latestDevice.humidity
                  ? latestDevice.humidity.toFixed(1)
                  : "—"}
              </p>
              <p className="text-xs text-gray-400">%</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <form onSubmit={handleSaveMedicine} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <FiFileText className="text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-800">Ongoing Medicine</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Enter medicines you are currently taking so your doctor can see them.
          </p>
          <textarea
            value={ongoingMedicine}
            onChange={(event) => setOngoingMedicine(event.target.value)}
            rows={4}
            placeholder="Example: Metformin 500 mg — once daily"
            className="w-full py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm resize-none"
          />
          <button
            type="submit"
            disabled={savingMedicine}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <FiSave /> {savingMedicine ? "Saving..." : "Save medicines"}
          </button>
        </form>
        <PatientDocuments title="My Shared Documents" />
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
        <div className="flex flex-wrap gap-3 mt-3">
          <a
            href="/patient/device-readings"
            className="bg-white/10 hover:bg-white/20 rounded-lg px-5 py-3 text-sm font-medium transition-colors"
          >
            → View Device Readings & Prescriptions
          </a>

          <a
            href="/patient/profile"
            className="bg-white/10 hover:bg-white/20 rounded-lg px-5 py-3 text-sm font-medium transition-colors"
          >
            → Edit Profile
          </a>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
