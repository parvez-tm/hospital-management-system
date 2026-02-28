import { useState, useEffect } from "react";
import { getAdminDoctors, deleteUser } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { toast } from "react-toastify";
import { FiUsers, FiTrash2, FiSearch } from "react-icons/fi";
import { FaHospital } from "react-icons/fa";

const AdminDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchDoctors = async () => {
    try {
      const { data } = await getAdminDoctors();
      setDoctors(data);
    } catch {
      toast.error("Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove Dr. ${name}?`)) return;
    try {
      await deleteUser(id);
      toast.success("Doctor removed");
      fetchDoctors();
    } catch {
      toast.error("Failed to remove doctor");
    }
  };

  const filtered = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase()) ||
      d.username.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">All Doctors</h1>
          <p className="text-gray-500 text-sm mt-1">{doctors.length} doctors across all hospitals</p>
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search doctors..."
            className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hospital</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Specialization</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-sm">
                        {doc.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">Dr. {doc.name}</p>
                        <p className="text-xs text-gray-400">@{doc.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{doc.email}</p>
                    <p className="text-xs text-gray-400">{doc.contactNo}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                      <FaHospital className="text-purple-500 text-xs" />
                      {doc.hospital?.name || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{doc.specialization || "General"}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(doc.id, doc.name)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Remove doctor"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <FiUsers className="text-4xl mx-auto mb-2 opacity-50" />
            <p>No doctors found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDoctors;
