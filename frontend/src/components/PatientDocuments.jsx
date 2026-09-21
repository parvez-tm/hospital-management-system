import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { FiDownload, FiFileText, FiPaperclip, FiUpload } from "react-icons/fi";
import {
  downloadPatientDocument,
  getPatientDocuments,
  uploadPatientDocument,
} from "../services/api";

const formatSize = (bytes) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const PatientDocuments = ({ patientId, title = "Shared Documents" }) => {
  const inputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    try {
      const { data } = await getPatientDocuments(patientId);
      setDocuments(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // patientId is stable for each page; refresh when viewing another patient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be 10 MB or smaller");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (patientId) formData.append("patientId", patientId);
    setUploading(true);
    try {
      await uploadPatientDocument(formData);
      toast.success("Document uploaded successfully");
      await fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document) => {
    try {
      const { data } = await downloadPatientDocument(document.id);
      const url = URL.createObjectURL(data);
      const link = window.document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to open document");
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FiFileText className="text-blue-500" /> {title}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Documents shared by the patient and doctor
          </p>
        </div>
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiUpload /> {uploading ? "Uploading..." : "Upload document"}
          </button>
        </>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-4">Loading documents...</p>
      ) : documents.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400">
          <FiPaperclip className="mx-auto text-2xl mb-2" />
          <p className="text-sm">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {documents.map((document) => (
            <div key={document.id} className="py-3 flex items-center gap-3">
              <FiFileText className="text-gray-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate" title={document.originalName}>
                  {document.originalName}
                </p>
                <p className="text-xs text-gray-500">
                  {document.documentUploader?.name || "User"} · {document.uploaderRole === "doctor" ? "Doctor" : "Patient"} · {formatSize(document.fileSize)} · {new Date(document.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(document)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg"
              >
                <FiDownload /> View
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default PatientDocuments;
