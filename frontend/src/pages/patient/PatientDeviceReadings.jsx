import { useState, useEffect } from "react";
import {
  getMyHealthReadings,
  getMyHealthStats,
  getPatientVitals,
  getDoctorsForPatient,
  submitPatientReport,
} from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { toast } from "react-toastify";
import {
  FiHeart,
  FiThermometer,
  FiWind,
  FiActivity,
  FiRadio,
  FiDownload,
  FiCheckCircle,
  FiClock,
  FiPlus,
  FiX,
} from "react-icons/fi";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

const PatientDeviceReadings = () => {
  const [readings, setReadings] = useState([]);
  const [stats, setStats] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [doctors, setDoctors] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [patientNotes, setPatientNotes] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const refreshData = async () => {
    try {
      const [readingsRes, statsRes, vitalsRes] = await Promise.all([
        getMyHealthReadings(100),
        getMyHealthStats(),
        getPatientVitals(),
      ]);
      setReadings(readingsRes.data);
      setStats(statsRes.data);
      setVitals(vitalsRes.data || []);
    } catch {
      toast.error("Failed to refresh device readings");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [readingsRes, statsRes, vitalsRes, doctorsRes] = await Promise.all([
          getMyHealthReadings(100),
          getMyHealthStats(),
          getPatientVitals(),
          getDoctorsForPatient(),
        ]);
        setReadings(readingsRes.data);
        setStats(statsRes.data);
        setVitals(vitalsRes.data || []);
        setDoctors(doctorsRes.data || []);
        if (doctorsRes.data && doctorsRes.data.length > 0) {
          setSelectedDoctorId(doctorsRes.data[0].id);
        }
      } catch {
        toast.error("Failed to load device readings");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleReviewRequest = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      toast.warn("Please select a doctor to review your report");
      return;
    }
    setSubmittingReport(true);
    try {
      const avgHR = stats?.averages?.pulse_rate || 0;
      const avgSPO2 = stats?.averages?.spo2 || 0;
      const avgTemp = stats?.averages?.body_temp || 0;
      const avgSystolic = stats?.averages?.bp_systolic || 0;
      const avgDiastolic = stats?.averages?.bp_diastolic || 0;

      await submitPatientReport({
        systolic: avgSystolic,
        diastolic: avgDiastolic,
        pulse: avgHR,
        oxygen: avgSPO2,
        temperature: avgTemp,
        notes: patientNotes,
        doctorId: selectedDoctorId,
      });

      toast.success("Telemetry report submitted to doctor successfully!");
      setPatientNotes("");
      setShowReviewModal(false);
      
      // Refresh vitals list
      const vitalsRes = await getPatientVitals();
      setVitals(vitalsRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit review request");
    } finally {
      setSubmittingReport(false);
    }
  };

  // ── Download full report as PDF ──
  const downloadFullReport = () => {
    try {
      if (readings.length === 0) {
        toast.warn("No readings to download");
        return;
      }

      const doc = new jsPDF({ orientation: "landscape" });

      // ── Elegant Clinical Header ──
      doc.setFillColor(15, 23, 42); // slate-900 (Dark Slate Blue)
      doc.rect(0, 0, 297, 28, "F");
      doc.setFillColor(13, 148, 136); // teal-600 (Teal Accent Line)
      doc.rect(0, 28, 297, 3, "F");

      // Draw premium vector medical logo (prevents image loading crashes)
      doc.setFillColor(13, 148, 136); // teal-600
      doc.circle(23, 14, 7, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1.5);
      doc.line(23, 10, 23, 18);
      doc.line(19, 14, 27, 14);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("MEDICARE CLINICAL TELEMETRY LOG", 38, 12);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(204, 251, 241); // light teal text
    doc.text("Certified patient vital signs log captured from remote sensor telemetry.", 38, 20);

    // Generation Timestamp on Header Right
    const genDateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
    doc.setTextColor(255, 255, 255);
    doc.text(`Generated: ${genDateStr}`, 282, 12, { align: "right" });
    doc.text(`Total Readings: ${readings.length}`, 282, 20, { align: "right" });

    // ── Patient Info Card (Left) ──
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
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
    doc.text(userInfo?.name || "N/A", 31, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`${userInfo?.age || "—"} yrs  |  ${userInfo?.contactNo || "—"}`, 41, 53);
    doc.text(userInfo?.email || "—", 30, 58);

    doc.setTextColor(100, 116, 139);
    doc.text("Height / Weight:", 82, 48);
    doc.text("Condition:", 82, 53);
    
    doc.setTextColor(30, 41, 59);
    doc.text(`${userInfo?.height ? userInfo.height + " cm" : "—"}  /  ${userInfo?.weight ? userInfo.weight + " kg" : "—"}`, 105, 48);
    doc.setFont("helvetica", "bold");
    doc.text(userInfo?.disease || "Not specified", 97, 53);

    // ── Health Summary Averages Card (Right) ──
    doc.setFillColor(240, 253, 250); // teal-50
    doc.setDrawColor(204, 251, 241); // teal-100
    doc.roundedRect(152, 36, 130, 26, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(13, 148, 136); // teal-600
    doc.text("HEALTH SUMMARY AVERAGES (METRICS)", 157, 42);

    if (stats && stats.count > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("HEART RATE", 157, 48);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(220, 38, 38); // red-600
      doc.text(`${stats.averages.pulse_rate} bpm`, 157, 56);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("OXYGEN SpO₂", 192, 48);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(37, 99, 235); // blue-600
      doc.text(`${stats.averages.spo2}%`, 192, 56);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("BODY TEMP", 224, 48);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(217, 119, 6); // amber-600
      doc.text(`${stats.averages.body_temp}°C`, 224, 56);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("BLOOD PRESSURE", 254, 48);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(109, 40, 217); // purple-600
      doc.text(`${stats.averages.bp_systolic}/${stats.averages.bp_diastolic}`, 254, 56);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("No stats summary available.", 157, 48);
    }

    // ── Readings Table Formatting ──
    const tableData = [...readings].reverse().map((r) => {
      const status = r.spo2 >= 95 && r.pulse_rate >= 50 && r.pulse_rate <= 110 && r.bp_systolic < 140 ? "Normal" : "Review";
      return [
        new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        new Date(r.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        r.pulse_rate ? `${r.pulse_rate} bpm` : "—",
        r.spo2 ? `${r.spo2}%` : "—",
        r.body_temp ? `${Number(r.body_temp).toFixed(1)}°C` : "—",
        r.bp_systolic && r.bp_diastolic ? `${r.bp_systolic}/${r.bp_diastolic} mmHg` : "—",
        r.env_temp ? `${Number(r.env_temp).toFixed(1)}°C` : "—",
        r.humidity ? `${Number(r.humidity).toFixed(1)}%` : "—",
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

    // ── Integrated Rx Prescriptions Section ──
    const activePrescriptions = vitals.filter(v => v.prescription || v.notes);
    if (activePrescriptions.length > 0) {
      const lastTableY = doc.lastAutoTable.finalY + 8;
      let prescY = lastTableY;
      
      if (prescY > 140) {
        doc.addPage();
        prescY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("RECENT PRESCRIPTIONS & ADVICE", 15, prescY);
      prescY += 5;

      activePrescriptions.slice(-2).forEach((p, idx) => {
        if (prescY > 165) {
          doc.addPage();
          prescY = 20;
        }

        // Card Container
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
          year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
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
    }

    // Footers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`System-Generated Clinical Telemetry Log — Page ${i} of ${pageCount}`, 15, doc.internal.pageSize.height - 8);
      doc.text("Confidential Clinical Record • MediCare HMS", 282, doc.internal.pageSize.height - 8, { align: "right" });
    }

    doc.save(`device_readings_report_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("Report downloaded!");
    } catch (err) {
      console.error("PDF generation error: ", err);
      toast.error("Failed to generate PDF report: " + err.message);
    }
  };

  // ── Download a single reading as a mini report ──
  const downloadSingleReading = (r) => {
    const doc = new jsPDF();

    // ── Elegant Clinical Header ──
    doc.setFillColor(15, 23, 42); // slate-900 (Dark Slate Blue)
    doc.rect(0, 0, 210, 28, "F");
    doc.setFillColor(13, 148, 136); // teal-600 (Teal Accent Line)
    doc.rect(0, 28, 210, 3, "F");

    // Add Logo
    try {
      const logoImg = new Image();
      logoImg.src = "/logo.jpeg";
      doc.addImage(logoImg, "JPEG", 15, 4, 20, 20);
    } catch (e) {
      // Continue without logo
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("MEDICARE HEALTHCARE — CLINICAL ASSESSMENT SLIP", 38, 12);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(204, 251, 241); // light teal text
    doc.text("Instant telemetry vital signs reading captured from remote medical monitoring.", 38, 20);

    // Generation Dates on Header Right
    const recDate = new Date(r.createdAt).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric"
    });
    doc.setTextColor(255, 255, 255);
    doc.text(`Log Date: ${recDate}`, 195, 12, { align: "right" });
    doc.text(`Time: ${new Date(r.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`, 195, 20, { align: "right" });

    // ── Patient Info Card ──
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(15, 36, 180, 28, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(13, 148, 136); // teal-600
    doc.text("PATIENT FILE DETAILS", 20, 42);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Name:", 20, 48);
    doc.text("Age / Contact:", 20, 53);
    doc.text("Email:", 20, 58);

    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFont("helvetica", "bold");
    doc.text(userInfo?.name || "N/A", 31, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`${userInfo?.age || "—"} yrs  |  ${userInfo?.contactNo || "—"}`, 41, 53);
    doc.text(userInfo?.email || "—", 30, 58);

    doc.setTextColor(100, 116, 139);
    doc.text("Height / Weight:", 110, 48);
    doc.text("Condition:", 110, 53);
    doc.text("Device Serial:", 110, 58);

    doc.setTextColor(30, 41, 59);
    doc.text(`${userInfo?.height ? userInfo.height + " cm" : "—"}  /  ${userInfo?.weight ? userInfo.weight + " kg" : "—"}`, 133, 48);
    doc.setFont("helvetica", "bold");
    doc.text(userInfo?.disease || "Not specified", 126, 53);
    doc.text(r.deviceId || "ESP32-001", 130, 58);

    const spo2Ok = r.spo2 >= 95;
    const hrOk = r.pulse_rate >= 50 && r.pulse_rate <= 110;
    const bpOk = r.bp_systolic < 140;

    // ── Upgraded Vitals AutoTable with Standards ──
    autoTable(doc, {
      startY: 70,
      head: [["Vitals Parameter", "Observed Value", "Standard Reference Range", "Status"]],
      body: [
        ["Heart / Pulse Rate", r.pulse_rate ? `${r.pulse_rate} bpm` : "—", "50 - 110 bpm", hrOk ? "Normal" : "Review"],
        ["Blood Oxygen (SpO₂)", r.spo2 ? `${r.spo2}%` : "—", "95% - 100%", spo2Ok ? "Normal" : "Low"],
        ["Body Temperature", r.body_temp ? `${r.body_temp.toFixed(1)}°C` : "—", "36.0°C - 37.5°C", r.body_temp >= 36.0 && r.body_temp <= 37.5 ? "Normal" : "Review"],
        ["Systolic Blood Pressure", r.bp_systolic ? `${r.bp_systolic} mmHg` : "—", "< 140 mmHg", bpOk ? "Normal" : "High"],
        ["Diastolic Blood Pressure", r.bp_diastolic ? `${r.bp_diastolic} mmHg` : "—", "< 90 mmHg", r.bp_diastolic < 90 ? "Normal" : "High"],
        ["Room Temperature", r.env_temp ? `${r.env_temp.toFixed(1)}°C` : "—", "—", "—"],
        ["Environment Humidity", r.humidity ? `${r.humidity.toFixed(1)}%` : "—", "—", "—"],
      ],
      theme: "striped",
      headStyles: { fillColor: [15, 23, 42], fontSize: 8.5, fontStyle: "bold", halign: "center" },
      styles: { fontSize: 8, cellPadding: 3, halign: "center" },
      columnStyles: {
        0: { halign: "left", fontStyle: "bold" },
        1: { halign: "center" },
        3: { fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.column.index === 3 && data.section === "body") {
          const val = data.cell.raw;
          if (val === "Normal") data.cell.styles.textColor = [22, 163, 74];
          else if (val === "Review" || val === "High" || val === "Low") data.cell.styles.textColor = [220, 38, 38];
        }
      }
    });

    // ── Integrated Rx Prescription Pad ──
    let prescY = doc.lastAutoTable.finalY + 8;
    if (prescY > 175) {
      doc.addPage();
      prescY = 20;
    }

    const latestPrescription = vitals.find(v => v.prescription || v.notes);
    if (latestPrescription) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("LATEST MEDICAL PRESCRIPTION & CLINICAL GUIDANCE", 15, prescY);
      prescY += 5;

      // Card Container
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(241, 245, 249);
      doc.roundedRect(15, prescY, 180, 40, 1.5, 1.5, "FD");

      // Amber Rx Side panel
      doc.setFillColor(254, 243, 199);
      doc.rect(15, prescY, 12, 40, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(217, 119, 6); // amber-600 Rx
      doc.text("Rx", 18, prescY + 23);

      // Medicines List column
      if (latestPrescription.prescription) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(13, 148, 136);
        doc.text("Medicines & Dosage Instructions:", 32, prescY + 6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        const medLines = doc.splitTextToSize(latestPrescription.prescription, 75);
        doc.text(medLines, 32, prescY + 11);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("No specific medications prescribed.", 32, prescY + 6);
      }

      // Clinical Notes Column
      if (latestPrescription.notes) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(13, 148, 136);
        doc.text("Doctor Advice & Lifestyle Notes:", 112, prescY + 6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        const noteLines = doc.splitTextToSize(latestPrescription.notes, 78);
        doc.text(noteLines, 112, prescY + 11);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("No specific clinical advice recorded.", 112, prescY + 6);
      }

      prescY += 48;
    }

    // ── Clinical Notes & Reference Disclaimers ──
    if (prescY > 235) {
      doc.addPage();
      prescY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Clinical Notes & Telemetry Reference Disclaimers:", 15, prescY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("• Blood pressure estimations are derived from heart rate telemetry and are reference values.", 15, prescY + 5);
    doc.text("• Body temperature readings represent skin-surface telemetry calculated via sensor calibrations.", 15, prescY + 9);
    doc.text("• This report is for remote health monitoring reference only and does not replace medical-grade laboratory diagnostics.", 15, prescY + 13);

    // ── Page Footers ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Clinical Telemetry Assessment — Page ${i} of ${pageCount}`, 15, doc.internal.pageSize.height - 8);
      doc.text("Confidential • MediCare HMS", 195, doc.internal.pageSize.height - 8, { align: "right" });
    }

    doc.save(`device_reading_${new Date(r.createdAt).toISOString().split("T")[0]}_${new Date(r.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }).replace(/[:\s]/g, "")}.pdf`);
    toast.success("Report downloaded!");
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Device Health Readings
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Sensor data captured from your monitoring sessions
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {stats && stats.count > 0 && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-medium text-sm hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-200 transition-all"
            >
              <FiPlus /> Submit for Doctor Review
            </button>
          )}
          {readings.length > 0 && (
            <button
              onClick={downloadFullReport}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium text-sm hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-200 transition-all"
            >
              <FiDownload /> Download Full Report
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {stats && stats.count > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Averages (last 50 readings)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border border-red-100 p-4 text-center">
              <FiHeart className="mx-auto text-red-500 mb-1" size={18} />
              <p className="text-xs text-gray-500">Avg Heart Rate</p>
              <p className="text-xl font-bold text-gray-800">
                {stats.averages.pulse_rate}
              </p>
              <p className="text-xs text-gray-400">bpm</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 text-center">
              <FiWind className="mx-auto text-blue-500 mb-1" size={18} />
              <p className="text-xs text-gray-500">Avg SpO₂</p>
              <p className="text-xl font-bold text-gray-800">
                {stats.averages.spo2}
              </p>
              <p className="text-xs text-gray-400">%</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100 p-4 text-center">
              <FiThermometer
                className="mx-auto text-orange-500 mb-1"
                size={18}
              />
              <p className="text-xs text-gray-500">Avg Body Temp</p>
              <p className="text-xl font-bold text-gray-800">
                {stats.averages.body_temp}
              </p>
              <p className="text-xs text-gray-400">°C</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100 p-4 text-center">
              <FiActivity
                className="mx-auto text-purple-500 mb-1"
                size={18}
              />
              <p className="text-xs text-gray-500">Avg BP</p>
              <p className="text-xl font-bold text-gray-800">
                {stats.averages.bp_systolic}/{stats.averages.bp_diastolic}
              </p>
              <p className="text-xs text-gray-400">mmHg</p>
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-100 p-4 text-center">
              <FiThermometer
                className="mx-auto text-teal-500 mb-1"
                size={18}
              />
              <p className="text-xs text-gray-500">Avg Room Temp</p>
              <p className="text-xl font-bold text-gray-800">
                {stats.averages.env_temp}
              </p>
              <p className="text-xs text-gray-400">°C</p>
            </div>
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl border border-sky-100 p-4 text-center">
              <FiWind className="mx-auto text-sky-500 mb-1" size={18} />
              <p className="text-xs text-gray-500">Avg Humidity</p>
              <p className="text-xl font-bold text-gray-800">
                {stats.averages.humidity}
              </p>
              <p className="text-xs text-gray-400">%</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-right">
            Total readings: {stats.count}
          </p>
        </div>
      )}

      {/* Review Requests Status Panel */}
      {vitals.length > 0 && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            Status of Your Doctor Review Requests
          </h3>
          <div className="space-y-4">
            {[...vitals].reverse().map((v, idx) => {
              const isReviewed = v.prescription || v.notes;
              return (
                <div
                  key={v.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isReviewed
                      ? "bg-gradient-to-r from-emerald-50/50 to-teal-50/30 border-emerald-100"
                      : "bg-gradient-to-r from-orange-50/50 to-amber-50/30 border-orange-100"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      {isReviewed ? (
                        <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                          <FiCheckCircle size={12} /> Reviewed by Dr. {v.doctorInfo?.name || "Practitioner"}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-orange-100 text-orange-800 rounded-full animate-pulse">
                          <FiClock size={12} /> Pending Doctor Review
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        Submitted on {new Date(v.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-gray-500">
                      Vitals: HR: {v.pulse} bpm | SpO₂: {v.oxygen}% | Temp: {v.temperature}°C | BP: {v.systolic}/{v.diastolic}
                    </div>
                  </div>

                  {v.notes && !isReviewed && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-500">Your Symptoms / Notes:</p>
                      <p className="text-sm text-gray-700 bg-white/60 p-2.5 rounded-lg border border-gray-100 whitespace-pre-wrap mt-1">
                        {v.notes}
                      </p>
                    </div>
                  )}

                  {isReviewed ? (
                    <div className="bg-white/80 p-3 rounded-lg border border-emerald-100/50 mt-2">
                      <p className="text-xs font-bold text-teal-800">Doctor Prescription & Treatment Advice:</p>
                      {v.prescription && (
                        <p className="text-sm text-gray-800 font-medium mt-1 whitespace-pre-wrap">
                          💊 {v.prescription}
                        </p>
                      )}
                      {v.notes && v.prescription && <div className="border-t border-teal-50 my-2" />}
                      {v.notes && (
                        <p className="text-xs text-gray-600 italic whitespace-pre-wrap">
                          Advice: {v.notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      Your doctor has been notified and will review your telemetry data shortly.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Readings Table */}
      {readings.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800">
              All Readings ({readings.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Date & Time</th>
                  <th className="px-4 py-3 text-center">Heart Rate</th>
                  <th className="px-4 py-3 text-center">SpO₂</th>
                  <th className="px-4 py-3 text-center">Body Temp</th>
                  <th className="px-4 py-3 text-center">Blood Pressure</th>
                  <th className="px-4 py-3 text-center">Room Temp</th>
                  <th className="px-4 py-3 text-center">Humidity</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...readings].reverse().map((r) => {
                  const isNormal =
                    r.spo2 >= 95 &&
                    r.pulse_rate >= 50 &&
                    r.pulse_rate <= 110 &&
                    r.bp_systolic < 140;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        <span className="text-gray-400">
                          {new Date(r.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {r.pulse_rate}{" "}
                        <span className="text-gray-400 font-normal text-xs">
                          bpm
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {r.spo2}
                        <span className="text-gray-400 font-normal text-xs">
                          %
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.body_temp ? r.body_temp.toFixed(1) : "—"}°C
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {r.bp_systolic}/{r.bp_diastolic}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {r.env_temp ? r.env_temp.toFixed(1) : "—"}°C
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {r.humidity ? r.humidity.toFixed(1) : "—"}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                           className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            isNormal
                              ? "bg-green-100 text-green-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {isNormal ? "Normal" : "Review"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <FiRadio className="text-5xl mx-auto mb-3 opacity-50" />
          <p className="text-lg">No device readings yet</p>
          <p className="text-sm mt-1">
            Your doctor will start a monitoring session during your visit
          </p>
        </div>
      )}
      {/* Submit Telemetry for Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
              <h3 className="text-lg font-bold">Submit Readings for Doctor Review</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handleReviewRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Select Doctor for Review
                </label>
                {doctors.length > 0 ? (
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full py-2 px-3.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white outline-none"
                  >
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.name} ({doc.specialization || "General Practitioner"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-red-500">No doctors currently available in the hospital</p>
                )}
              </div>

              {/* Pre-populated Vitals Summary */}
              {stats && stats.count > 0 && (
                <div className="bg-teal-50/50 rounded-xl border border-teal-100/50 p-4">
                  <p className="text-xs font-bold text-teal-800 mb-2">Pre-populated Telemetry Averages:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>• Heart Rate: <strong className="text-teal-900">{stats.averages.pulse_rate} bpm</strong></div>
                    <div>• SpO₂ Oxygen: <strong className="text-teal-900">{stats.averages.spo2}%</strong></div>
                    <div>• Body Temp: <strong className="text-teal-900">{stats.averages.body_temp}°C</strong></div>
                    <div>• Blood Pressure: <strong className="text-teal-900">{stats.averages.bp_systolic}/{stats.averages.bp_diastolic} mmHg</strong></div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Describe Your Symptoms & Notes
                </label>
                <textarea
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  rows={4}
                  className="w-full py-2 px-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white outline-none resize-none"
                  placeholder="Tell your doctor how you are feeling (e.g., routine checkup, slight chest tightness, headache, etc.)."
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport || doctors.length === 0}
                  className="px-5 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-sm font-medium rounded-xl hover:from-teal-700 hover:to-cyan-700 shadow-md disabled:opacity-50"
                >
                  {submittingReport ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDeviceReadings;
