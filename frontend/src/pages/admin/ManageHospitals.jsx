import { useState, useEffect } from "react";
import { getAllHospitals, createHospital, updateHospital, toggleHospital } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { toast } from "react-toastify";
import { FaHospital } from "react-icons/fa";
import { FiPlus, FiEdit2, FiToggleLeft, FiToggleRight, FiX, FiUsers, FiUser } from "react-icons/fi";

const ManageHospitals = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "" });

  const fetchHospitals = async () => {
    try {
      const { data } = await getAllHospitals();
      setHospitals(data);
    } catch {
      toast.error("Failed to load hospitals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", address: "", phone: "", email: "" });
    setShowModal(true);
  };

  const openEdit = (h) => {
    setEditing(h);
    setForm({ name: h.name, address: h.address, phone: h.phone, email: h.email });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateHospital(editing.id, form);
        toast.success("Hospital updated");
      } else {
        await createHospital(form);
        toast.success("Hospital created");
      }
      setShowModal(false);
      fetchHospitals();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleHospital(id);
      toast.success("Hospital status toggled");
      fetchHospitals();
    } catch {
      toast.error("Failed to toggle status");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Hospitals</h1>
          <p className="text-gray-500 text-sm mt-1">{hospitals.length} hospitals registered</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-200 transition-all"
        >
          <FiPlus /> Add Hospital
        </button>
      </div>

      {/* Hospital Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {hospitals.map((h) => (
          <div
            key={h.id}
            className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow ${
              h.isActive ? "border-gray-100" : "border-red-100 bg-red-50/30"
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                  h.isActive ? "bg-purple-100 text-purple-600" : "bg-red-100 text-red-500"
                }`}>
                  <FaHospital />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{h.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    h.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {h.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p className="truncate">📍 {h.address}</p>
              <p>📞 {h.phone}</p>
              <p className="truncate">✉️ {h.email}</p>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 py-3 border-y border-gray-100">
              <span className="flex items-center gap-1">
                <FiUsers className="text-teal-500" /> {h.doctorCount || 0} Doctors
              </span>
              <span className="flex items-center gap-1">
                <FiUser className="text-blue-500" /> {h.patientCount || 0} Patients
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openEdit(h)}
                className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FiEdit2 /> Edit
              </button>
              <button
                onClick={() => handleToggle(h.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  h.isActive
                    ? "text-red-600 bg-red-50 hover:bg-red-100"
                    : "text-green-600 bg-green-50 hover:bg-green-100"
                }`}
              >
                {h.isActive ? <><FiToggleRight /> Disable</> : <><FiToggleLeft /> Enable</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {hospitals.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FaHospital className="text-5xl mx-auto mb-3 opacity-50" />
          <p className="text-lg">No hospitals yet</p>
          <p className="text-sm">Click &quot;Add Hospital&quot; to create one</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                {editing ? "Edit Hospital" : "Add New Hospital"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                  placeholder="City General Hospital"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  required
                  className="w-full py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                  placeholder="123 Main St, City"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    className="w-full py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                    placeholder="555-0123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="w-full py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                    placeholder="info@hospital.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-200"
              >
                {editing ? "Update Hospital" : "Create Hospital"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageHospitals;
