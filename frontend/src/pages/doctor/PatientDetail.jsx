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
  addPatientVitals,
  updatePatientVitals,
  deletePatientVitals,
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
  FiEdit2,
  FiTrash2,
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
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [addingPrescription, setAddingPrescription] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescriptionForm, setPrescriptionForm] = useState({
    medicines: "",
    notes: "",
  });
  const [editingPrescriptionId, setEditingPrescriptionId] = useState(null);
  const [editPrescriptionForm, setEditPrescriptionForm] = useState({
    medicines: "",
    notes: "",
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
      // Get prescriptions and review requests from vitals data
      if (data.vitals) {
        setPrescriptions(data.vitals);
      }
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

  const handleAddPrescription = async (e) => {
    e.preventDefault();
    if (!prescriptionForm.medicines.trim() && !prescriptionForm.notes.trim()) {
      toast.warn("Please enter medicines or notes");
      return;
    }
    setAddingPrescription(true);
    try {
      await addPatientVitals({
        patientId: id,
        systolic: 0,
        diastolic: 0,
        pulse: 0,
        oxygen: 0,
        temperature: 0,
        prescription: prescriptionForm.medicines,
        notes: prescriptionForm.notes,
      });
      toast.success("Prescription added successfully");
      setPrescriptionForm({ medicines: "", notes: "" });
      setShowPrescriptionForm(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add prescription");
    } finally {
      setAddingPrescription(false);
    }
  };

  const handleDeletePrescription = async (prescriptionId) => {
    if (!window.confirm("Are you sure you want to delete this prescription?")) return;
    try {
      await deletePatientVitals(prescriptionId);
      toast.success("Prescription deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete prescription");
    }
  };

  const handleEditPrescription = (p) => {
    setEditingPrescriptionId(p.id);
    setEditPrescriptionForm({
      medicines: p.prescription || "",
      notes: p.notes || "",
    });
  };

  const handleUpdatePrescription = async (e) => {
    e.preventDefault();
    try {
      await updatePatientVitals(editingPrescriptionId, {
        prescription: editPrescriptionForm.medicines,
        notes: editPrescriptionForm.notes,
      });
      toast.success("Prescription updated successfully");
      setEditingPrescriptionId(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update prescription");
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

    // ── Elegant Clinical Header ──
    doc.setFillColor(15, 23, 42); // slate-900 (Dark Slate Blue)
    doc.rect(0, 0, 297, 28, "F");
    doc.setFillColor(13, 148, 136); // teal-600 (Teal Accent Line)
    doc.rect(0, 28, 297, 3, "F");

    // Add Hospital Logo
    try {
      const logoImg = new Image();
      logoImg.src = "/logo.jpeg";
      doc.addImage(logoImg, "JPEG", 15, 4, 20, 20);
    } catch (e) {
      // Continue without logo
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("MEDICARE HEALTHCARE RECORD — CLINICAL ASSESSMENT", 38, 12);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(204, 251, 241); // light teal text
    doc.text("Comprehensive clinical patient health monitoring assessment from sensor telemetry.", 38, 20);

    // Generation Timestamp on Header Right
    const genDateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
    doc.setTextColor(255, 255, 255);
    doc.text(`Generated: ${genDateStr}`, 282, 12, { align: "right" });
    doc.text(`Total Readings Analyzed: ${reportReadings.length}`, 282, 20, { align: "right" });

    // ── Patient Info Card (Left) ──
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(15, 36, 130, 26, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(13, 148, 136); // teal-600
    doc.text("PATIENT FILE DETAILS", 20, 42);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Name:", 20, 48);
    doc.text("Age / Contact:", 20, 53);
    doc.text("Email:", 20, 58);

    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFont("helvetica", "bold");
    doc.text(patient?.name || "N/A", 31, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`${patient?.age || "N/A"} yrs  |  ${patient?.contactNo || "N/A"}`, 41, 53);
    doc.text(patient?.email || "N/A", 30, 58);

    doc.setTextColor(100, 116, 139);
    doc.text("Height / Weight:", 82, 48);
    doc.text("Condition:", 82, 53);
    
    doc.setTextColor(30, 41, 59);
    doc.text(`${patient?.height ? patient.height + " cm" : "—"}  /  ${patient?.weight ? patient.weight + " kg" : "—"}`, 105, 48);
    doc.setFont("helvetica", "bold");
    doc.text(patient?.disease || "Not specified", 97, 53);

    // ── Calculate Health Averages from Telemetry ──
    let avgHR = 0, avgSPO2 = 0, avgTemp = 0, avgSystolic = 0, avgDiastolic = 0;
    let countHR = 0, countSPO2 = 0, countTemp = 0, countBP = 0;

    reportReadings.forEach(r => {
      if (r.pulse_rate) { avgHR += r.pulse_rate; countHR++; }
      if (r.spo2) { avgSPO2 += r.spo2; countSPO2++; }
      if (r.body_temp) { avgTemp += r.body_temp; countTemp++; }
      if (r.bp_systolic && r.bp_diastolic) { avgSystolic += r.bp_systolic; avgDiastolic += r.bp_diastolic; countBP++; }
    });

    avgHR = countHR > 0 ? Math.round(avgHR / countHR) : "—";
    avgSPO2 = countSPO2 > 0 ? Math.round(avgSPO2 / countSPO2) : "—";
    avgTemp = countTemp > 0 ? (avgTemp / countTemp).toFixed(1) : "—";
    avgSystolic = countBP > 0 ? Math.round(avgSystolic / countBP) : "—";
    avgDiastolic = countBP > 0 ? Math.round(avgDiastolic / countBP) : "—";

    // ── Health Summary Averages Card (Right) ──
    doc.setFillColor(240, 253, 250); // teal-50
    doc.setDrawColor(204, 251, 241); // teal-100
    doc.roundedRect(152, 36, 130, 26, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(13, 148, 136); // teal-600
    doc.text("HEALTH TELEMETRY SUMMARY (AVERAGES)", 157, 42);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("HEART RATE", 157, 48);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(220, 38, 38); // red-600
    doc.text(`${avgHR} bpm`, 157, 56);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("OXYGEN SpO₂", 192, 48);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text(`${avgSPO2}%`, 192, 56);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("BODY TEMP", 224, 48);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(`${avgTemp}°C`, 224, 56);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("BLOOD PRESSURE", 254, 48);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(109, 40, 217); // purple-600
    doc.text(`${avgSystolic}/${avgDiastolic}`, 254, 56);

    // ── Table Data Formatter ──
    const tableData = [...reportReadings].reverse().map((r) => {
      const status = r.spo2 >= 95 && r.pulse_rate >= 50 && r.pulse_rate <= 110 && r.bp_systolic < 140 ? "Normal" : "Review";
      return [
        new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        new Date(r.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        r.pulse_rate ? `${r.pulse_rate} bpm` : "—",
        r.spo2 ? `${r.spo2}%` : "—",
        r.body_temp ? `${r.body_temp.toFixed(1)}°C` : "—",
        r.bp_systolic && r.bp_diastolic ? `${r.bp_systolic}/${r.bp_diastolic} mmHg` : "—",
        r.env_temp ? `${r.env_temp.toFixed(1)}°C` : "—",
        r.humidity ? `${r.humidity.toFixed(1)}%` : "—",
        status,
      ];
    });

    autoTable(doc, {
      startY: 67,
      head: [["Date", "Time", "HR (bpm)", "SpO₂", "Body Temp", "BP (mmHg)", "Room Temp", "Humidity", "Status"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: "bold", halign: "center" },
      styles: { fontSize: 7, cellPadding: 2, halign: "center" },
      columnStyles: {
        0: { halign: "left" },
        1: { halign: "left" },
        8: { fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.column.index === 8 && data.section === "body") {
          data.cell.styles.textColor = data.cell.raw === "Review" ? [220, 38, 38] : [22, 163, 74];
        }
      },
    });

    // ── High-fidelity Prescription Cards Section ──
    if (prescriptions.length > 0) {
      const lastTableY = doc.lastAutoTable.finalY + 8;
      let prescY = lastTableY;
      
      if (prescY > 140) {
        doc.addPage();
        prescY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("HISTORICAL PRESCRIPTIONS & CLINICAL NOTES", 15, prescY);
      prescY += 5;

      prescriptions.slice(-2).forEach((p, idx) => {
        if (prescY > 165) {
          doc.addPage();
          prescY = 20;
        }

        // Draw elegant container
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(241, 245, 249); // slate-100 card border
        doc.roundedRect(15, prescY, 267, 28, 1, 1, "FD");

        // Amber Rx Side Panel
        doc.setFillColor(254, 243, 199); // amber-100
        doc.rect(15, prescY, 12, 28, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(217, 119, 6); // amber-600 Rx Symbol
        doc.text("Rx", 18, prescY + 16);

        // Date of prescription
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // slate-400
        const pDate = new Date(p.createdAt).toLocaleDateString("en-US", {
          year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        });
        doc.text(`Prescription Date: ${pDate}`, 32, prescY + 5);

        // Medicines details
        if (p.prescription) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(13, 148, 136); // teal-600
          doc.text("Medicines & Dosage Instructions:", 32, prescY + 10);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85); // slate-700
          const medLines = doc.splitTextToSize(p.prescription, 110);
          doc.text(medLines, 32, prescY + 14);
        }

        // Doctor's notes details
        if (p.notes) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(13, 148, 136); // teal-600
          doc.text("Doctor Advice & Clinical Notes:", 152, prescY + 10);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85); // slate-700
          const noteLines = doc.splitTextToSize(p.notes, 125);
          doc.text(noteLines, 152, prescY + 14);
        }

        prescY += 32;
      });

      // Signature Section
      if (prescY > 175) {
        doc.addPage();
        prescY = 20;
      }
      
      const sigY = 190;
      doc.setDrawColor(148, 163, 184);
      doc.line(210, sigY, 282, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text("Authorized Clinical Physician", 210, sigY + 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("Dr. Medicare Practitioner", 210, sigY + 8);
      doc.setFont("helvetica", "italic");
      doc.text("Electronic Signature Verification", 210, sigY + 11);
    }

    // Footers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`System-Generated Comprehensive Health Report — Page ${i} of ${pageCount}`, 15, doc.internal.pageSize.height - 5);
      doc.text("Confidential Clinical Data • MediCare HMS", 282, doc.internal.pageSize.height - 5, { align: "right" });
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
          <button
            onClick={() => setShowPrescriptionForm(!showPrescriptionForm)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-medium text-sm hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-200 transition-all"
          >
            {showPrescriptionForm ? (
              <>
                <FiX /> Cancel
              </>
            ) : (
              <>
                <FiPlus /> Prescription
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

      {/* Prescription & Medical Notes Form */}
      {showPrescriptionForm && (
        <div className="mb-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl shadow-lg border border-orange-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            💊 Add Prescription & Medical Notes
          </h3>
          <form onSubmit={handleAddPrescription} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medicines & Dosage
              </label>
              <textarea
                value={prescriptionForm.medicines}
                onChange={(e) =>
                  setPrescriptionForm({ ...prescriptionForm, medicines: e.target.value })
                }
                rows={4}
                className="w-full py-2.5 px-4 border border-orange-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none bg-white"
                placeholder="Enter medicines, dosage, frequency, and duration&#10;Example: Aspirin 500mg - 1 tablet twice daily for 7 days"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical Notes & Instructions
              </label>
              <textarea
                value={prescriptionForm.notes}
                onChange={(e) =>
                  setPrescriptionForm({ ...prescriptionForm, notes: e.target.value })
                }
                rows={3}
                className="w-full py-2.5 px-4 border border-orange-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none bg-white"
                placeholder="Additional notes, warnings, follow-up instructions, etc."
              />
            </div>
            <button
              type="submit"
              disabled={addingPrescription}
              className="px-8 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-xl text-sm hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-200 transition-all disabled:opacity-50"
            >
              {addingPrescription ? "Saving..." : "Save Prescription"}
            </button>
          </form>
        </div>
      )}

      {/* Prescription History */}
      {prescriptions.length > 0 && (
        <div className="mb-6 bg-white rounded-2xl shadow-lg border border-orange-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            📋 Prescription History ({prescriptions.length})
          </h3>
          <div className="space-y-4">
            {[...prescriptions].reverse().map((p, idx) => {
              const isReviewRequest = !p.prescription;
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border p-5 hover:shadow-md transition-all ${
                    isReviewRequest
                      ? "bg-gradient-to-br from-red-50/70 to-orange-50/30 border-orange-200 shadow-sm"
                      : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"
                  }`}
                >
                  {editingPrescriptionId === p.id ? (
                    <form onSubmit={handleUpdatePrescription} className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-orange-700">
                          {isReviewRequest ? "Adding Prescription to Patient Review Request" : `Editing Prescription #${prescriptions.length - idx}`}
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-orange-800 mb-1">Medicines & Dosage:</label>
                        <textarea
                          value={editPrescriptionForm.medicines}
                          onChange={(e) => setEditPrescriptionForm({ ...editPrescriptionForm, medicines: e.target.value })}
                          rows={3}
                          className="w-full py-2 px-3 border border-orange-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-400"
                          placeholder="e.g., Paracetamol 500mg twice daily for 3 days."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-orange-800 mb-1">Doctor's Medical Advice & Notes:</label>
                        <textarea
                          value={editPrescriptionForm.notes}
                          onChange={(e) => setEditPrescriptionForm({ ...editPrescriptionForm, notes: e.target.value })}
                          rows={2}
                          className="w-full py-2 px-3 border border-orange-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-400"
                          placeholder="e.g., Rest, drink plenty of fluids, and monitor temperature."
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingPrescriptionId(null)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-xs font-medium rounded-lg hover:from-teal-700 hover:to-cyan-700"
                        >
                          Save Review & Prescribe
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-sm font-bold ${isReviewRequest ? "text-red-600" : "text-orange-700"}`}>
                          {isReviewRequest ? "🚨 Patient Telemetry Review Request" : `Prescription #${prescriptions.length - idx}`}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">
                            {new Date(p.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <button
                            onClick={() => handleEditPrescription(p)}
                            className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors"
                            title={isReviewRequest ? "Add Prescription" : "Edit Prescription"}
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeletePrescription(p.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Display Telemetry values from request if present */}
                      {(p.pulse > 0 || p.oxygen > 0 || p.temperature > 0) && (
                        <div className="mb-3 bg-white/60 rounded-xl p-3 border border-orange-100/50">
                          <p className="text-xs font-bold text-gray-500 mb-1.5">Submitted Telemetry Averages:</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-700">
                            <div>• Heart Rate: <strong className="text-gray-900">{p.pulse} bpm</strong></div>
                            <div>• SpO₂: <strong className="text-gray-900">{p.oxygen}%</strong></div>
                            <div>• Body Temp: <strong className="text-gray-900">{p.temperature}°C</strong></div>
                            <div>• BP: <strong className="text-gray-900">{p.systolic}/{p.diastolic} mmHg</strong></div>
                          </div>
                        </div>
                      )}

                      {isReviewRequest ? (
                        <div>
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-orange-800 mb-1">Patient Symptoms / Notes:</p>
                            <p className="text-sm text-gray-700 bg-white rounded-lg p-3 whitespace-pre-wrap border border-orange-100">
                              {p.notes || "Routine check-in request."}
                            </p>
                          </div>
                          <button
                            onClick={() => handleEditPrescription(p)}
                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg text-xs font-semibold hover:from-orange-600 hover:to-red-700 shadow-md shadow-orange-100 transition-all flex items-center justify-center gap-1.5"
                          >
                            <FiEdit2 size={12} /> Review & Add Prescription
                          </button>
                        </div>
                      ) : (
                        <>
                          {p.prescription && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-orange-800 mb-1">Medicines & Dosage:</p>
                              <p className="text-sm text-gray-700 bg-white rounded-lg p-3 whitespace-pre-wrap border border-orange-100">
                                {p.prescription}
                              </p>
                            </div>
                          )}
                          {p.notes && (
                            <div>
                              <p className="text-xs font-semibold text-orange-800 mb-1">Medical Notes:</p>
                              <p className="text-sm text-gray-700 bg-white rounded-lg p-3 whitespace-pre-wrap border border-orange-100">
                                {p.notes}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
