import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getDoctorPatientDetail, addPatientVitals } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { toast } from "react-toastify";
import { FiArrowLeft, FiPlus, FiX, FiHeart, FiThermometer, FiWind } from "react-icons/fi";

const PatientDetail = () => {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    systolic: "",
    diastolic: "",
    pulse: "",
    oxygen: "",
    temperature: "",
    prescription: "",
    notes: "",
  });

  const fetchData = async () => {
    try {
      const { data } = await getDoctorPatientDetail(id);
      setPatient(data.patient);
      setVitals(data.vitals);
    } catch {
      toast.error("Failed to load patient details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addPatientVitals({
        patientId: id,
        ...form,
        systolic: Number(form.systolic),
        diastolic: Number(form.diastolic),
        pulse: Number(form.pulse),
        oxygen: Number(form.oxygen),
        temperature: Number(form.temperature),
      });
      toast.success("Vitals added successfully");
      setShowForm(false);
      setForm({ systolic: "", diastolic: "", pulse: "", oxygen: "", temperature: "", prescription: "", notes: "" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add vitals");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!patient) return <p className="text-center text-gray-500 py-12">Patient not found</p>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/doctor/patients" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <FiArrowLeft className="text-gray-600" size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{patient.name}</h1>
          <p className="text-gray-500 text-sm">@{patient.username} • {patient.email}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium text-sm hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-200 transition-all"
        >
          {showForm ? <><FiX /> Cancel</> : <><FiPlus /> Add Vitals</>}
        </button>
      </div>

      {/* Patient Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Age</p>
          <p className="text-xl font-bold text-gray-800">{patient.age || "N/A"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Height</p>
          <p className="text-xl font-bold text-gray-800">{patient.height || "N/A"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Weight</p>
          <p className="text-xl font-bold text-gray-800">{patient.weight || "N/A"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Contact</p>
          <p className="text-sm font-bold text-gray-800">{patient.contactNo}</p>
        </div>
      </div>

      {/* Add Vitals Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Vitals Record</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Systolic (mmHg)</label>
                <input type="number" value={form.systolic} onChange={(e) => setForm({ ...form, systolic: e.target.value })} required
                  className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" placeholder="120" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Diastolic (mmHg)</label>
                <input type="number" value={form.diastolic} onChange={(e) => setForm({ ...form, diastolic: e.target.value })} required
                  className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" placeholder="80" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Pulse (bpm)</label>
                <input type="number" value={form.pulse} onChange={(e) => setForm({ ...form, pulse: e.target.value })} required
                  className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" placeholder="72" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Oxygen (%)</label>
                <input type="number" value={form.oxygen} onChange={(e) => setForm({ ...form, oxygen: e.target.value })} required
                  className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" placeholder="98" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Temp (°F)</label>
                <input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} required
                  className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" placeholder="98.6" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prescription</label>
              <textarea value={form.prescription} onChange={(e) => setForm({ ...form, prescription: e.target.value })} rows={3}
                className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                placeholder="Medications, dosage, instructions..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                placeholder="Additional observations..." />
            </div>
            <button type="submit" disabled={submitting}
              className="px-8 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium rounded-xl text-sm hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-200 transition-all disabled:opacity-50">
              {submitting ? "Saving..." : "Save Vitals"}
            </button>
          </form>
        </div>
      )}

      {/* Vitals History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Vitals History ({vitals.length} records)</h3>
        <div className="space-y-3">
          {vitals.map((v) => (
            <div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400">
                  {new Date(v.createdAt).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                <span className="text-xs text-gray-500">
                  By: Dr. {v.doctorInfo?.name || "Unknown"}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-3 mb-3">
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <FiHeart className="mx-auto text-red-500 mb-1" />
                  <p className="text-xs text-gray-500">BP</p>
                  <p className="text-sm font-bold text-gray-800">{v.systolic}/{v.diastolic}</p>
                </div>
                <div className="text-center p-2 bg-pink-50 rounded-lg">
                  <FiHeart className="mx-auto text-pink-500 mb-1" />
                  <p className="text-xs text-gray-500">Pulse</p>
                  <p className="text-sm font-bold text-gray-800">{v.pulse} bpm</p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <FiWind className="mx-auto text-blue-500 mb-1" />
                  <p className="text-xs text-gray-500">O₂</p>
                  <p className="text-sm font-bold text-gray-800">{v.oxygen}%</p>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded-lg">
                  <FiThermometer className="mx-auto text-orange-500 mb-1" />
                  <p className="text-xs text-gray-500">Temp</p>
                  <p className="text-sm font-bold text-gray-800">{v.temperature}°F</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p className={`text-xs font-bold ${v.oxygen >= 95 && v.systolic < 140 ? "text-green-600" : "text-orange-600"}`}>
                    {v.oxygen >= 95 && v.systolic < 140 ? "Normal" : "Review"}
                  </p>
                </div>
              </div>

              {v.prescription && (
                <div className="mt-3 p-3 bg-teal-50 rounded-lg">
                  <p className="text-xs font-medium text-teal-700 mb-1">💊 Prescription</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{v.prescription}</p>
                </div>
              )}
              {v.notes && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-1">📝 Notes</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{v.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {vitals.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <FiHeart className="text-4xl mx-auto mb-2 opacity-50" />
            <p>No vitals records yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDetail;
