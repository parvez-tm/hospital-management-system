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

  const isPendingReviewRecord = (record) =>
    record.reviewStatus === "pending" ||
    (!record.reviewStatus && record.submittedBy === "patient" && !record.prescription);

  const downloadReport = (vital) => {
    if (isPendingReviewRecord(vital)) {
      toast.info("This request is still pending doctor review.");
      return;
    }

    const doc = new jsPDF();
    const user = JSON.parse(localStorage.getItem("userInfo") || "{}");

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
    } catch {
      // Continue without logo
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("MEDICARE HEALTHCARE — OFFICIAL VITAL SIGNS RECORD", 38, 12);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(204, 251, 241); // light teal text
    doc.text("Certified Clinical Diagnostic Assessment and Treatment Log.", 38, 20);

    // Generation Dates on Header Right
    const recDate = new Date(vital.createdAt).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric"
    });
    doc.setTextColor(255, 255, 255);
    doc.text(`Record Date: ${recDate}`, 195, 12, { align: "right" });
    doc.text("Status: Finalized", 195, 20, { align: "right" });

    // ── Patient Info Card ──
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(15, 36, 180, 28, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(13, 148, 136); // teal-600
    doc.text("PATIENT CLINICAL METADATA", 20, 42);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Name:", 20, 48);
    doc.text("Age / Contact:", 20, 53);
    doc.text("Email:", 20, 58);

    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFont("helvetica", "bold");
    doc.text(user?.name || "N/A", 31, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`${user?.age || "N/A"} yrs  |  ${user?.contactNo || "N/A"}`, 41, 53);
    doc.text(user?.email || "N/A", 30, 58);

    doc.setTextColor(100, 116, 139);
    doc.text("Height / Weight:", 110, 48);
    doc.text("Condition:", 110, 53);
    doc.text("Attending Dr:", 110, 58);

    doc.setTextColor(30, 41, 59);
    doc.text(`${user?.height ? user.height + " cm" : "—"}  /  ${user?.weight ? user.weight + " kg" : "—"}`, 133, 48);
    doc.setFont("helvetica", "bold");
    doc.text(user?.disease || "Not specified", 126, 53);
    doc.text(`Dr. ${vital.doctorInfo?.name || "Practitioner"}`, 129, 58);

    // ── Upgraded Vitals AutoTable with Standards ──
    autoTable(doc, {
      startY: 70,
      head: [["Vitals Parameter", "Observed Value", "Standard Reference Range", "Assessment"]],
      body: [
        ["Systolic Blood Pressure", `${vital.systolic} mmHg`, "< 140 mmHg", vital.systolic < 140 ? "Normal" : "High"],
        ["Diastolic Blood Pressure", `${vital.diastolic} mmHg`, "< 90 mmHg", vital.diastolic < 90 ? "Normal" : "High"],
        ["Heart / Pulse Rate", `${vital.pulse} bpm`, "60 - 100 bpm", vital.pulse >= 60 && vital.pulse <= 100 ? "Normal" : "Review"],
        ["Blood Oxygen (SpO₂)", `${vital.oxygen}%`, "95% - 100%", vital.oxygen >= 95 ? "Normal" : "Low"],
        ["Body Temperature", `${vital.temperature}°F`, "97.0°F - 99.5°F", vital.temperature >= 97 && vital.temperature <= 99.5 ? "Normal" : "Review"],
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
          else data.cell.styles.textColor = [220, 38, 38];
        }
      }
    });

    // ── Beautiful RX Prescription Pad ──
    let prescY = doc.lastAutoTable.finalY + 8;
    if (prescY > 175) {
      doc.addPage();
      prescY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("PRESCRIBED TREATMENT & CLINICAL GUIDANCE", 15, prescY);
    prescY += 5;

    // Card Container
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(241, 245, 249);
    doc.roundedRect(15, prescY, 180, 45, 1.5, 1.5, "FD");

    // Amber Rx Side panel
    doc.setFillColor(254, 243, 199);
    doc.rect(15, prescY, 12, 45, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(217, 119, 6); // amber-600 Rx
    doc.text("Rx", 18, prescY + 25);

    // Medicines List column
    if (vital.prescription) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(13, 148, 136);
      doc.text("Medicines & Dosage Instructions:", 32, prescY + 7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const medLines = doc.splitTextToSize(vital.prescription, 75);
      doc.text(medLines, 32, prescY + 12);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("No specific medications prescribed.", 32, prescY + 7);
    }

    // Clinical Notes Column
    if (vital.notes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(13, 148, 136);
      doc.text("Doctor Advice & Lifestyle Notes:", 112, prescY + 7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const noteLines = doc.splitTextToSize(vital.notes, 78);
      doc.text(noteLines, 112, prescY + 12);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("No specific clinical advice recorded.", 112, prescY + 7);
    }

    prescY += 53;

    // ── Signature Section ──
    if (prescY > 230) {
      doc.addPage();
      prescY = 20;
    }

    const sigY = 250;
    doc.setDrawColor(148, 163, 184);
    doc.line(125, sigY, 195, sigY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("Attending Physician Signature", 125, sigY + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Dr. ${vital.doctorInfo?.name || "Practitioner"}`, 125, sigY + 8);
    if (vital.doctorInfo?.specialization) {
      doc.text(vital.doctorInfo.specialization, 125, sigY + 11);
    }
    doc.setFont("helvetica", "italic");
    doc.text("Electronic Clinical Validation", 125, sigY + 14);

    // ── Page Footers ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Clinical Health Record — Page ${i} of ${pageCount}`, 15, doc.internal.pageSize.height - 8);
      doc.text("Confidential • MediCare HMS", 195, doc.internal.pageSize.height - 8, { align: "right" });
    }

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
        {vitals.map((v) => {
          const isPending = isPendingReviewRecord(v);
          return (
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
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={isPending ? "Pending doctor review" : "Download report"}
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
                <p className={`text-xs font-bold mt-1 ${isPending ? "text-orange-600" : v.oxygen >= 95 && v.systolic < 140 ? "text-green-600" : "text-orange-600"}`}>
                  {isPending ? "Pending" : v.oxygen >= 95 && v.systolic < 140 ? "Normal" : "Review"}
                </p>
              </div>
            </div>

            {isPending && (v.patientNotes || v.notes) && (
              <div className="mt-3 p-3 bg-orange-50 rounded-lg">
                <p className="text-xs font-medium text-orange-700 mb-1">Your symptoms / request</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{v.patientNotes || v.notes}</p>
              </div>
            )}
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
        );
        })}
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
