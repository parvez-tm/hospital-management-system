import { useState, useEffect } from "react";
import { getPatientVitals } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { toast } from "react-toastify";
import { FiHeart, FiThermometer, FiWind, FiDownload } from "react-icons/fi";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

const PatientVitals = () => {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getPatientVitals();
        setVitals(data);
      } catch {
        toast.error("Failed to load vitals");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const downloadReport = (vital) => {
    const doc = new jsPDF();
    const user = JSON.parse(localStorage.getItem("userInfo") || "{}");

    // Header with logo
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, 210, 50, "F");
    
    // Add logo from public folder
    try {
      const logoImg = new Image();
      logoImg.src = "/logo.jpeg";
      doc.addImage(logoImg, "JPEG", 15, 8, 15, 15);
    } catch (e) {
      // Logo not available, continue without it
    }
    
    doc.setTextColor(255);
    doc.setFontSize(20);
    doc.text("MediCare HMS", 35, 18);
    doc.setFontSize(10);
    doc.text("Patient Vitals Report", 35, 28);
    
    // Patient Information Section
    doc.setTextColor(80);
    doc.setFontSize(9);
    doc.text("PATIENT INFORMATION", 15, 58);
    doc.setFillColor(245, 245, 245);
    doc.rect(15, 60, 180, 45, "F");
    
    doc.setTextColor(60);
    doc.setFontSize(9);
    const patientInfo = [
      `Name: ${user?.name || "N/A"}`,
      `Age: ${user?.age || "N/A"} | Height: ${user?.height || "N/A"} | Weight: ${user?.weight || "N/A"}`,
      `Disease/Condition: ${user?.disease || "Not specified"}`,
      `Email: ${user?.email || "N/A"}`,
      `Phone: ${user?.contactNo || "N/A"}`,
      `Date: ${new Date(vital.createdAt).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      })}`,
      `Doctor: Dr. ${vital.doctorInfo?.name || "Unknown"}${vital.doctorInfo?.specialization ? ` (${vital.doctorInfo.specialization})` : ""}`,
    ];
    
    let yPos = 65;
    patientInfo.forEach((info) => {
      doc.text(info, 18, yPos);
      yPos += 6;
    });

    // Vitals table
    autoTable(doc, {
      startY: 107,
      head: [["Vitals Parameter", "Value", "Unit", "Status"]],
      body: [
        ["Systolic BP", vital.systolic, "mmHg", vital.systolic < 140 ? "Normal" : "High"],
        ["Diastolic BP", vital.diastolic, "mmHg", vital.diastolic < 90 ? "Normal" : "High"],
        ["Pulse Rate", vital.pulse, "bpm", vital.pulse >= 60 && vital.pulse <= 100 ? "Normal" : "Review"],
        ["Oxygen (SpO₂)", vital.oxygen, "%", vital.oxygen >= 95 ? "Normal" : "Low"],
        ["Temperature", vital.temperature, "°F", vital.temperature >= 97 && vital.temperature <= 99.5 ? "Normal" : "Review"],
      ],
      theme: "striped",
      headStyles: { fillColor: [13, 148, 136] },
      styles: { fontSize: 11 },
    });

    // Prescription section
    const tableEnd = doc.lastAutoTable.finalY + 15;
    if (vital.prescription) {
      doc.setFontSize(12);
      doc.setTextColor(13, 148, 136);
      doc.text("MEDICINES & PRESCRIPTION:", 15, tableEnd);
      doc.setTextColor(60);
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(vital.prescription, 180);
      doc.text(lines, 15, tableEnd + 8);
    }

    // Notes section
    if (vital.notes) {
      const notesY = vital.prescription
        ? tableEnd + 8 + doc.splitTextToSize(vital.prescription, 180).length * 5 + 10
        : tableEnd;
      doc.setFontSize(12);
      doc.setTextColor(13, 148, 136);
      doc.text("DOCTOR NOTES:", 15, notesY);
      doc.setTextColor(60);
      doc.setFontSize(10);
      const noteLines = doc.splitTextToSize(vital.notes, 180);
      doc.text(noteLines, 15, notesY + 8);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("This is a system-generated report from MediCare HMS", 15, 285);

    doc.save(`vitals_report_${new Date(vital.createdAt).toISOString().split("T")[0]}.pdf`);
    toast.success("Report downloaded!");
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Vitals History</h1>
        <p className="text-gray-500 text-sm mt-1">{vitals.length} records</p>
      </div>

      <div className="space-y-4">
        {vitals.map((v) => (
          <div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {new Date(v.createdAt).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
                <p className="text-xs text-gray-400">
                  By Dr. {v.doctorInfo?.name || "Unknown"}
                  {v.doctorInfo?.specialization && ` (${v.doctorInfo.specialization})`}
                </p>
              </div>
              <button
                onClick={() => downloadReport(v)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                title="Download report"
              >
                <FiDownload /> Report
              </button>
            </div>

            <div className="grid grid-cols-5 gap-3 mb-3">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <FiHeart className="mx-auto text-red-500 mb-1" />
                <p className="text-xs text-gray-500">BP</p>
                <p className="text-sm font-bold text-gray-800">{v.systolic}/{v.diastolic}</p>
              </div>
              <div className="text-center p-3 bg-pink-50 rounded-lg">
                <FiHeart className="mx-auto text-pink-500 mb-1" />
                <p className="text-xs text-gray-500">Pulse</p>
                <p className="text-sm font-bold text-gray-800">{v.pulse} bpm</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <FiWind className="mx-auto text-blue-500 mb-1" />
                <p className="text-xs text-gray-500">O₂</p>
                <p className="text-sm font-bold text-gray-800">{v.oxygen}%</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <FiThermometer className="mx-auto text-orange-500 mb-1" />
                <p className="text-xs text-gray-500">Temp</p>
                <p className="text-sm font-bold text-gray-800">{v.temperature}°F</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <p className={`text-xs font-bold mt-1 ${v.oxygen >= 95 && v.systolic < 140 ? "text-green-600" : "text-orange-600"}`}>
                  {v.oxygen >= 95 && v.systolic < 140 ? "✓ Normal" : "⚠ Review"}
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
        <div className="text-center py-16 text-gray-400">
          <FiHeart className="text-5xl mx-auto mb-3 opacity-50" />
          <p className="text-lg">No vitals records yet</p>
          <p className="text-sm">Your doctor will add records during your visits</p>
        </div>
      )}
    </div>
  );
};

export default PatientVitals;
