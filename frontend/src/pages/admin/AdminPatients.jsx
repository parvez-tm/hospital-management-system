import { useState, useEffect } from "react";
import {
  createAdminPatient,
  getAdminDoctors,
  getAdminPatients,
  deleteUser,
} from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { toast } from "react-toastify";
import { FiUser, FiTrash2, FiSearch, FiPlus, FiX } from "react-icons/fi";

const emptyPatientForm = {
  name: "",
  email: "",
  username: "",
  password: "",
  contactNo: "",
  age: "",
  height: "",
  weight: "",
  disease: "",
  assignedDoctor: "",
};

const AdminPatients = () => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyPatientForm);

  const fetchPatients = async () => {
    try {
      const { data } = await getAdminPatients();
      setPatients(data);
    } catch {
      toast.error("Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data } = await getAdminDoctors();
      setDoctors(data);
    } catch {
      toast.error("Failed to load doctors");
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
  }, []);

  const openCreate = () => {
    setForm({
      ...emptyPatientForm,
      assignedDoctor: doctors[0]?.id || "",
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createAdminPatient({
        ...form,
        assignedDoctor: form.assignedDoctor || null,
      });
      toast.success("Patient account created");
      setShowModal(false);
      setForm(emptyPatientForm);
      fetchPatients();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create patient");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove patient ${name}?`)) return;
    try {
      await deleteUser(id);
      toast.success("Patient removed");
      fetchPatients();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove patient");
    }
  };

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q) ||
      p.doctor?.name?.toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Patients</h1>
          <p className="text-gray-500 text-sm mt-1">{patients.length} patients managed by this hospital admin</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-200 transition-all"
          >
            <FiPlus /> Add Patient
          </button>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients..."
              className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Doctor</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((pat) => (
                <tr key={pat.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {pat.name?.charAt(0)?.toUpperCase() || "P"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{pat.name}</p>
                        <p className="text-xs text-gray-400">@{pat.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{pat.email}</p>
                    <p className="text-xs text-gray-400">{pat.contactNo}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {pat.doctor ? `Dr. ${pat.doctor.name}` : "Unassigned"}
                    </span>
                    {pat.doctor?.specialization && (
                      <p className="text-xs text-gray-400">{pat.doctor.specialization}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {pat.age && <span>Age: {pat.age}</span>}
                      {pat.height && <span className="ml-3">H: {pat.height}</span>}
                      {pat.weight && <span className="ml-3">W: {pat.weight}</span>}
                    </div>
                    {pat.disease && <p className="text-xs text-gray-400 mt-1">{pat.disease}</p>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(pat.id, pat.name)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Remove patient"
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
            <FiUser className="text-4xl mx-auto mb-2 opacity-50" />
            <p>No patients found</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Add Patient</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input name="name" value={form.name} onChange={handleChange} required placeholder="Full name" className="py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                <input name="username" value={form.username} onChange={handleChange} required placeholder="Username" className="py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="Email" className="py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                <input name="contactNo" value={form.contactNo} onChange={handleChange} required placeholder="Contact number" className="py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="Temporary password" className="py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                <select name="assignedDoctor" value={form.assignedDoctor} onChange={handleChange} className="py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm">
                  <option value="">No assigned doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.name} ({doctor.specialization || "General"})
                    </option>
                  ))}
                </select>
                <input name="age" type="number" value={form.age} onChange={handleChange} placeholder="Age" className="py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                <input name="height" value={form.height} onChange={handleChange} placeholder="Height" className="py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                <input name="weight" value={form.weight} onChange={handleChange} placeholder="Weight" className="py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                <input name="disease" value={form.disease} onChange={handleChange} placeholder="Condition / disease" className="py-3 px-4 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50">
                  Cancel
                </button>
                <button disabled={saving} type="submit" className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50">
                  {saving ? "Creating..." : "Create Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPatients;
