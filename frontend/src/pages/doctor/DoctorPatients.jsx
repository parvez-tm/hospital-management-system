import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getDoctorPatients } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { toast } from "react-toastify";
import { FiUser, FiSearch, FiEye } from "react-icons/fi";

const DoctorPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getDoctorPatients();
        setPatients(data);
      } catch {
        toast.error("Failed to load patients");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.username.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Patients</h1>
          <p className="text-gray-500 text-sm mt-1">{patients.length} patients in your hospital</p>
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients..."
            className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((pat) => (
          <div
            key={pat.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                {pat.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 truncate">{pat.name}</h3>
                <p className="text-xs text-gray-400">@{pat.username}</p>
              </div>
            </div>

            <div className="space-y-1 text-sm text-gray-500 mb-4">
              <p>📧 {pat.email}</p>
              <p>📱 {pat.contactNo}</p>
              <div className="flex gap-4 mt-2">
                {pat.age && <span className="text-xs bg-gray-100 px-2 py-1 rounded-md">Age: {pat.age}</span>}
                {pat.height && <span className="text-xs bg-gray-100 px-2 py-1 rounded-md">H: {pat.height}</span>}
                {pat.weight && <span className="text-xs bg-gray-100 px-2 py-1 rounded-md">W: {pat.weight}</span>}
              </div>
            </div>

            <Link
              to={`/doctor/patients/${pat.id}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
            >
              <FiEye /> View Details & Vitals
            </Link>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FiUser className="text-5xl mx-auto mb-3 opacity-50" />
          <p className="text-lg">No patients found</p>
        </div>
      )}
    </div>
  );
};

export default DoctorPatients;
