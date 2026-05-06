import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getDoctorPatientDetail,
  startDeviceSession,
  stopDeviceSession,
  getActiveSession,
  getLatestReading,
  getDeviceReadings,
  updateDoctorPatient,
} from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { toast } from "react-toastify";
import {
  FiArrowLeft,
  FiPlus,
  FiX,
  FiHeart,
  FiThermometer,
  FiWind,
  FiActivity,
  FiRadio,
  FiStopCircle,
  FiDownload,
} from "react-icons/fi";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

const PatientDetail = () => {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditPatientInfo, setShowEditPatientInfo] = useState(false);
  const [editingPatientInfo, setEditingPatientInfo] = useState(false);
  const [editPatientForm, setEditPatientForm] = useState({
    age: "",
    height: "",
    weight: "",
    disease: "",
    contactNo: "",
  });

  // ── Live monitoring state ──
  const [activeSession, setActiveSession] = useState(null);
  const [liveReading, setLiveReading] = useState(null);
  const [liveReadings, setLiveReadings] = useState([]);
  const [allReadings, setAllReadings] = useState([]);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isStoppingSession, setIsStoppingSession] = useState(false);
  const pollIntervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const { data } = await getDoctorPatientDetail(id);
      setPatient(data.patient);
      // Initialize edit form with patient data
      setEditPatientForm({
        age: data.patient.age || "",
        height: data.patient.height || "",
        weight: data.patient.weight || "",
        disease: data.patient.disease || "",
        contactNo: data.patient.contactNo || "",
      });
    } catch {
      toast.error("Failed to load patient details");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllReadings = async () => {
    try {
      const { data: readings } = await getDeviceReadings(id, 100);
      if (readings) setAllReadings(readings);
    } catch {
      // silent
    }
  };

  // Check if there's an active session for this patient
  const checkActiveSession = useCallback(async () => {
    try {
      const { data } = await getActiveSession();
      if (data.session && String(data.session.patientId) === String(id)) {
        setActiveSession(data.session);
      } else {
        setActiveSession(null);
      }
    } catch {
      // silent
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    checkActiveSession();
    fetchAllReadings();
  }, [id, checkActiveSession]);

  // Poll for live readings when session is active
  useEffect(() => {
    if (activeSession) {
      const poll = async () => {
        try {
          const { data: latest } = await getLatestReading(id);
          if (latest) setLiveReading(latest);

          const { data: readings } = await getDeviceReadings(id, 20);
          if (readings) setLiveReadings(readings);
        } catch {
          // silent
        }
      };

      poll(); // fetch immediately
      pollIntervalRef.current = setInterval(poll, 3000);

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    } else {
      // No active session — stop polling
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setLiveReading(null);
      setLiveReadings([]);
      fetchAllReadings();
    }
  }, [activeSession, id]);

  const handleStartSession = async () => {
    setIsStartingSession(true);
    try {
      const { data } = await startDeviceSession({
        patientId: id,
        deviceId: "ESP32-001",
      });
      setActiveSession(data.session);
      toast.success(`Monitoring started for ${patient.name}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start session");
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleStopSession = async () => {
    setIsStoppingSession(true);
    try {
      const { data } = await stopDeviceSession({ deviceId: "ESP32-001" });
      setActiveSession(null);
      toast.success(
        `Monitoring stopped — ${data.readingsCount} readings captured`
      );
      fetchData(); // Refresh vitals history
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to stop session");
    } finally {
      setIsStoppingSession(false);
    }
  };

  const handleUpdatePatientInfo = async (e) => {
    e.preventDefault();
    setEditingPatientInfo(true);
    try {
      const { data } = await updateDoctorPatient(id, editPatientForm);
      setPatient(data);
      toast.success("Patient information updated successfully");
      setShowEditPatientInfo(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update patient info");
    } finally {
      setEditingPatientInfo(false);
    }
  };

  // Format time ago
  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 10) return "just now";
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  // ── Download device readings PDF ──
  const downloadDeviceReport = () => {
    const reportReadings = liveReadings.length > 0 ? liveReadings : allReadings;
    if (reportReadings.length === 0) {
      toast.warn("No device readings to download");
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });

    // Header with logo
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, 297, 50, "F");
    
    // Add logo from public folder
    try {
      const logoImg = new Image();
      logoImg.src = "/logo.jpeg";
      doc.addImage(logoImg, "JPEG", 15, 10, 15, 15);
    } catch (e) {
      // Logo not available, continue without it
    }
    
    doc.setTextColor(255);
    doc.setFontSize(18);
    doc.text("MediCare HMS - Device Health Readings Report", 35, 18);
    
    // Patient Information Section
    doc.setTextColor(80);
    doc.setFontSize(8);
    doc.text("PATIENT INFORMATION", 15, 58);
    doc.setFillColor(245, 245, 245);
    doc.rect(15, 60, 267, 30, "F");
    
    doc.setTextColor(60);
    doc.setFontSize(8);
    const patientInfo = [
      `Name: ${patient?.name || "N/A"} | Age: ${patient?.age || "N/A"} | Height: ${patient?.height || "N/A"} | Weight: ${patient?.weight || "N/A"}`,
      `Disease/Condition: ${patient?.disease || "Not specified"}`,
      `Email: ${patient?.email || "N/A"} | Phone: ${patient?.contactNo || "N/A"}`,
      `Generated: ${new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
      })} | Total Readings: ${reportReadings.length}`,
    ];
    
    let yPos = 65;
    patientInfo.forEach((info) => {
      doc.text(info, 18, yPos);
      yPos += 6;
    });

    const tableData = [...reportReadings].reverse().map((r) => {
      const status = r.spo2 >= 95 && r.pulse_rate >= 50 && r.pulse_rate <= 110 && r.bp_systolic < 140 ? "Normal" : "Review";
      return [
        new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        new Date(r.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        r.pulse_rate || "—",
        r.spo2 ? `${r.spo2}%` : "—",
        r.body_temp ? `${r.body_temp.toFixed(1)}°C` : "—",
        r.bp_systolic && r.bp_diastolic ? `${r.bp_systolic}/${r.bp_diastolic}` : "—",
        r.env_temp ? `${r.env_temp.toFixed(1)}°C` : "—",
        r.humidity ? `${r.humidity.toFixed(1)}%` : "—",
        status,
      ];
    });

    autoTable(doc, {
      startY: 96,
      head: [["Date", "Time", "HR (bpm)", "SpO₂", "Body Temp", "BP", "Room Temp", "Humidity", "Status"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [13, 148, 136], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
      didParseCell: (data) => {
        if (data.column.index === 8 && data.section === "body") {
          data.cell.styles.textColor = data.cell.raw === "Review" ? [234, 88, 12] : [22, 163, 74];
        }
      },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`System-generated report — Page ${i}/${pageCount}`, 15, doc.internal.pageSize.height - 5);
    }

    doc.save(`device_readings_${patient?.name?.replace(/\s+/g, "_") || "patient"}_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("Report downloaded!");
  };

  if (loading) return <LoadingSpinner />;
  if (!patient)
    return (
      <p className="text-center text-gray-500 py-12">Patient not found</p>
    );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/doctor/patients"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiArrowLeft className="text-gray-600" size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{patient.name}</h1>
          <p className="text-gray-500 text-sm">
            @{patient.username} • {patient.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Monitor button */}
          {activeSession ? (
            <button
              onClick={handleStopSession}
              disabled={isStoppingSession}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-medium text-sm hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-200 transition-all disabled:opacity-50"
            >
              <FiStopCircle />
              {isStoppingSession ? "Stopping..." : "Stop Monitoring"}
            </button>
          ) : (
            <button
              onClick={handleStartSession}
              disabled={isStartingSession}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-medium text-sm hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
            >
              <FiRadio />
              {isStartingSession ? "Starting..." : "Start Monitoring"}
            </button>
          )}
          <button
            onClick={() => setShowEditPatientInfo(!showEditPatientInfo)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium text-sm hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-200 transition-all"
          >
            {showEditPatientInfo ? (
              <>
                <FiX /> Cancel
              </>
            ) : (
              <>
                <FiPlus /> Edit Info
              </>
            )}
          </button>
        </div>
      </div>

      {/* Patient Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Age</p>
          <p className="text-xl font-bold text-gray-800">
            {patient.age || "N/A"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Height</p>
          <p className="text-xl font-bold text-gray-800">
            {patient.height || "N/A"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Weight</p>
          <p className="text-xl font-bold text-gray-800">
            {patient.weight || "N/A"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Disease</p>
          <p className="text-sm font-bold text-gray-800">
            {patient.disease || "Not specified"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Contact</p>
          <p className="text-sm font-bold text-gray-800">
            {patient.contactNo}
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DEVICE READINGS PANEL                                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(activeSession || allReadings.length > 0) && (
        <div className="mb-6">
          {/* Status bar */}
          <div className="flex items-center gap-3 mb-4">
            {activeSession ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <h3 className="text-lg font-semibold text-gray-800">
                  Live Monitoring
                </h3>
                <span className="text-xs text-gray-400">
                  Device: {activeSession.deviceId || "ESP32-001"} • Session started{" "}
                  {new Date(activeSession.startedAt).toLocaleTimeString()}
                </span>
              </>
            ) : (
              <>
                <FiRadio className="text-gray-500" size={18} />
                <h3 className="text-lg font-semibold text-gray-800">
                  Device Readings History
                </h3>
                <span className="text-xs text-gray-400">
                  {allReadings.length} recorded readings
                </span>
              </>
            )}
          </div>

          {liveReading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              {/* Heart Rate */}
              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border border-red-100 p-4 text-center">
                <FiHeart className="mx-auto text-red-500 mb-1" size={20} />
                <p className="text-xs text-gray-500">Heart Rate</p>
                <p className="text-2xl font-bold text-gray-800">
                  {liveReading.pulse_rate || "—"}
                </p>
                <p className="text-xs text-gray-400">bpm</p>
              </div>

              {/* SpO2 */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 text-center">
                <FiWind className="mx-auto text-blue-500 mb-1" size={20} />
                <p className="text-xs text-gray-500">SpO₂</p>
                <p className="text-2xl font-bold text-gray-800">
                  {liveReading.spo2 || "—"}
                </p>
                <p className="text-xs text-gray-400">%</p>
              </div>

              {/* Body Temp */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100 p-4 text-center">
                <FiThermometer
                  className="mx-auto text-orange-500 mb-1"
                  size={20}
                />
                <p className="text-xs text-gray-500">Body Temp</p>
                <p className="text-2xl font-bold text-gray-800">
                  {liveReading.body_temp
                    ? liveReading.body_temp.toFixed(1)
                    : "—"}
                </p>
                <p className="text-xs text-gray-400">°C</p>
              </div>

              {/* Blood Pressure */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100 p-4 text-center">
                <FiActivity
                  className="mx-auto text-purple-500 mb-1"
                  size={20}
                />
                <p className="text-xs text-gray-500">Blood Pressure</p>
                <p className="text-2xl font-bold text-gray-800">
                  {liveReading.bp_systolic || "—"}/
                  {liveReading.bp_diastolic || "—"}
                </p>
                <p className="text-xs text-gray-400">mmHg</p>
              </div>

              {/* Room Temp */}
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-100 p-4 text-center">
                <FiThermometer
                  className="mx-auto text-teal-500 mb-1"
                  size={20}
                />
                <p className="text-xs text-gray-500">Room Temp</p>
                <p className="text-2xl font-bold text-gray-800">
                  {liveReading.env_temp
                    ? liveReading.env_temp.toFixed(1)
                    : "—"}
                </p>
                <p className="text-xs text-gray-400">°C</p>
              </div>

              {/* Humidity */}
              <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl border border-sky-100 p-4 text-center">
                <FiWind className="mx-auto text-sky-500 mb-1" size={20} />
                <p className="text-xs text-gray-500">Humidity</p>
                <p className="text-2xl font-bold text-gray-800">
                  {liveReading.humidity
                    ? liveReading.humidity.toFixed(1)
                    : "—"}
                </p>
                <p className="text-xs text-gray-400">%</p>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200 p-8 text-center mb-4">
              <FiRadio className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-gray-500 font-medium">
                Waiting for device data...
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Make sure the ESP32 device is powered on and connected to the
                same network
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {liveReading ? `Last updated: ${timeAgo(liveReading.createdAt)}` : `${allReadings.length} total readings`}
            </p>
            <button
              onClick={downloadDeviceReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
            >
              <FiDownload size={14} /> Download Report
            </button>
          </div>

          {/* Device readings table — live during session, historical otherwise */}
          {(() => {
            const displayReadings = liveReadings.length > 0 ? liveReadings : allReadings;
            return displayReadings.length > 0 ? (
              <div className="mt-4 bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700">
                    {liveReadings.length > 0 ? `Live Readings (${displayReadings.length})` : `All Device Readings (${displayReadings.length})`}
                  </h4>
                </div>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Date &amp; Time</th>
                        <th className="px-3 py-2 text-center">HR</th>
                        <th className="px-3 py-2 text-center">SpO₂</th>
                        <th className="px-3 py-2 text-center">Body °C</th>
                        <th className="px-3 py-2 text-center">BP</th>
                        <th className="px-3 py-2 text-center">Room °C</th>
                        <th className="px-3 py-2 text-center">Humidity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[...displayReadings].reverse().map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                            {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                            {new Date(r.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-3 py-2 text-center font-medium">{r.pulse_rate}</td>
                          <td className="px-3 py-2 text-center font-medium">{r.spo2}%</td>
                          <td className="px-3 py-2 text-center">{r.body_temp?.toFixed(1)}</td>
                          <td className="px-3 py-2 text-center">{r.bp_systolic}/{r.bp_diastolic}</td>
                          <td className="px-3 py-2 text-center">{r.env_temp?.toFixed(1)}</td>
                          <td className="px-3 py-2 text-center">{r.humidity?.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* Edit Patient Information Form */}
      {showEditPatientInfo && (
        <div className="mb-6 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Patient Information</h3>
          <form onSubmit={handleUpdatePatientInfo} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  value={editPatientForm.age}
                  onChange={(e) =>
                    setEditPatientForm({ ...editPatientForm, age: e.target.value })
                  }
                  className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="Age"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Height (cm)
                </label>
                <input
                  type="text"
                  value={editPatientForm.height}
                  onChange={(e) =>
                    setEditPatientForm({ ...editPatientForm, height: e.target.value })
                  }
                  className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="Height"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="text"
                  value={editPatientForm.weight}
                  onChange={(e) =>
                    setEditPatientForm({ ...editPatientForm, weight: e.target.value })
                  }
                  className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="Weight"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Contact No
                </label>
                <input
                  type="text"
                  value={editPatientForm.contactNo}
                  onChange={(e) =>
                    setEditPatientForm({ ...editPatientForm, contactNo: e.target.value })
                  }
                  className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="Contact No"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Disease/Condition
              </label>
              <textarea
                value={editPatientForm.disease}
                onChange={(e) =>
                  setEditPatientForm({ ...editPatientForm, disease: e.target.value })
                }
                rows={2}
                className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                placeholder="Disease/Condition..."
              />
            </div>
            <button
              type="submit"
              disabled={editingPatientInfo}
              className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl text-sm hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-200 transition-all disabled:opacity-50"
            >
              {editingPatientInfo ? "Updating..." : "Update Patient Info"}
            </button>
          </form>
        </div>
      )}


    </div>
  );
};

export default PatientDetail;
