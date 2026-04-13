import { useState, useEffect } from "react";
import { getMyHealthReadings, getMyHealthStats } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { toast } from "react-toastify";
import {
  FiHeart,
  FiThermometer,
  FiWind,
  FiActivity,
  FiRadio,
  FiDownload,
} from "react-icons/fi";
import jsPDF from "jspdf";
import "jspdf-autotable";

const PatientDeviceReadings = () => {
  const [readings, setReadings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [readingsRes, statsRes] = await Promise.all([
          getMyHealthReadings(100),
          getMyHealthStats(),
        ]);
        setReadings(readingsRes.data);
        setStats(statsRes.data);
      } catch {
        toast.error("Failed to load device readings");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Download full report as PDF ──
  const downloadFullReport = () => {
    if (readings.length === 0) {
      toast.warn("No readings to download");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });

    // Header bar
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, 297, 35, "F");
    doc.setTextColor(255);
    doc.setFontSize(18);
    doc.text("MediCare HMS", 15, 15);
    doc.setFontSize(10);
    doc.text("Device Health Readings Report", 15, 23);
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      15,
      30
    );
    doc.text(`Total Readings: ${readings.length}`, 200, 23);

    // Averages summary
    if (stats && stats.count > 0) {
      doc.text(
        `Averages — HR: ${stats.averages.pulse_rate} bpm | SpO₂: ${stats.averages.spo2}% | Temp: ${stats.averages.body_temp}°C | BP: ${stats.averages.bp_systolic}/${stats.averages.bp_diastolic} mmHg`,
        200,
        30
      );
    }

    // Readings table
    const tableData = [...readings].reverse().map((r) => {
      const spo2Ok = r.spo2 >= 95;
      const hrOk = r.pulse_rate >= 50 && r.pulse_rate <= 110;
      const bpOk = r.bp_systolic < 140;
      const status = spo2Ok && hrOk && bpOk ? "Normal" : "Review";

      return [
        new Date(r.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        new Date(r.createdAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        r.pulse_rate || "—",
        r.spo2 ? `${r.spo2}%` : "—",
        r.body_temp ? `${r.body_temp.toFixed(1)}°C` : "—",
        r.bp_systolic && r.bp_diastolic
          ? `${r.bp_systolic}/${r.bp_diastolic}`
          : "—",
        r.env_temp ? `${r.env_temp.toFixed(1)}°C` : "—",
        r.humidity ? `${r.humidity.toFixed(1)}%` : "—",
        status,
      ];
    });

    doc.autoTable({
      startY: 42,
      head: [
        [
          "Date",
          "Time",
          "Heart Rate (bpm)",
          "SpO₂",
          "Body Temp",
          "Blood Pressure",
          "Room Temp",
          "Humidity",
          "Status",
        ],
      ],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [13, 148, 136], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 24 },
        8: { fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.column.index === 8 && data.section === "body") {
          if (data.cell.raw === "Review") {
            data.cell.styles.textColor = [234, 88, 12]; // orange
          } else {
            data.cell.styles.textColor = [22, 163, 74]; // green
          }
        }
      },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `This is a system-generated report from MediCare HMS — Page ${i} of ${pageCount}`,
        15,
        doc.internal.pageSize.height - 8
      );
      doc.text(
        "Note: Blood pressure values are estimated from heart rate. Body temperature is approximate.",
        15,
        doc.internal.pageSize.height - 4
      );
    }

    doc.save(
      `device_readings_report_${new Date().toISOString().split("T")[0]}.pdf`
    );
    toast.success("Report downloaded!");
  };

  // ── Download a single reading as a mini report ──
  const downloadSingleReading = (r) => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255);
    doc.setFontSize(20);
    doc.text("MediCare HMS", 15, 18);
    doc.setFontSize(10);
    doc.text("Device Health Reading Report", 15, 28);
    doc.text(
      `Date: ${new Date(r.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      15,
      35
    );
    doc.text(
      `Time: ${new Date(r.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}`,
      130,
      28
    );
    doc.text(`Device: ${r.deviceId || "ESP32-001"}`, 130, 35);

    const spo2Ok = r.spo2 >= 95;
    const hrOk = r.pulse_rate >= 50 && r.pulse_rate <= 110;
    const bpOk = r.bp_systolic < 140;

    // Vitals table
    doc.autoTable({
      startY: 50,
      head: [["Parameter", "Value", "Unit", "Status"]],
      body: [
        [
          "Heart Rate",
          r.pulse_rate || "—",
          "bpm",
          hrOk ? "Normal" : "Review",
        ],
        [
          "Blood Oxygen (SpO₂)",
          r.spo2 || "—",
          "%",
          spo2Ok ? "Normal" : "Low",
        ],
        [
          "Body Temperature",
          r.body_temp ? r.body_temp.toFixed(1) : "—",
          "°C",
          r.body_temp >= 36.0 && r.body_temp <= 37.5 ? "Normal" : "Review",
        ],
        [
          "Systolic BP",
          r.bp_systolic || "—",
          "mmHg",
          bpOk ? "Normal" : "High",
        ],
        [
          "Diastolic BP",
          r.bp_diastolic || "—",
          "mmHg",
          r.bp_diastolic < 90 ? "Normal" : "High",
        ],
        ["Room Temperature", r.env_temp ? r.env_temp.toFixed(1) : "—", "°C", "—"],
        ["Humidity", r.humidity ? r.humidity.toFixed(1) : "—", "%", "—"],
      ],
      theme: "striped",
      headStyles: { fillColor: [13, 148, 136] },
      styles: { fontSize: 11 },
      didParseCell: (data) => {
        if (data.column.index === 3 && data.section === "body") {
          const val = data.cell.raw;
          if (val === "Normal") data.cell.styles.textColor = [22, 163, 74];
          else if (val === "Review" || val === "High" || val === "Low")
            data.cell.styles.textColor = [234, 88, 12];
        }
      },
    });

    // Notes
    const notesY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("⚠ Notes:", 15, notesY);
    doc.setFontSize(8);
    doc.text(
      "• Blood pressure values are estimated from heart rate — not a direct measurement.",
      15,
      notesY + 7
    );
    doc.text(
      "• Body temperature is approximate (derived from sensor die temperature + calibration offset).",
      15,
      notesY + 13
    );
    doc.text(
      "• Heart rate and SpO₂ readings are from a MAX30102 sensor — for reference only, not medical-grade.",
      15,
      notesY + 19
    );

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      "This is a system-generated report from MediCare HMS",
      15,
      285
    );

    doc.save(
      `device_reading_${new Date(r.createdAt).toISOString().split("T")[0]}_${new Date(r.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }).replace(/[:\s]/g, "")}.pdf`
    );
    toast.success("Report downloaded!");
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Device Health Readings
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Sensor data captured from your monitoring sessions
          </p>
        </div>
        {readings.length > 0 && (
          <button
            onClick={downloadFullReport}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-medium text-sm hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-200 transition-all"
          >
            <FiDownload /> Download Full Report
          </button>
        )}
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
                  <th className="px-4 py-3 text-center">Report</th>
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
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => downloadSingleReading(r)}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          title="Download this reading as PDF"
                        >
                          <FiDownload size={16} />
                        </button>
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
    </div>
  );
};

export default PatientDeviceReadings;
