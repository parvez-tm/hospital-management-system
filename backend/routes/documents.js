const express = require("express");
const multer = require("multer");
const { PatientDocument, PatientVitals, User } = require("../models");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, callback) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.mimetype)) {
      return callback(new Error("Only PDF, image, text, DOC, and DOCX files are allowed"));
    }
    callback(null, true);
  },
});

const canAccessPatient = async (user, patientId) => {
  if (user.role === "patient") return String(user.id) === String(patientId);
  if (user.role === "doctor") {
    const patient = await User.findOne({
      where: { id: patientId, role: "patient" },
      attributes: ["id", "assignedDoctor"],
    });
    if (!patient) return false;
    if (String(patient.assignedDoctor) === String(user.id)) return true;
    return (await PatientVitals.count({ where: { patientId, doctorId: user.id } })) > 0;
  }
  return user.role === "admin";
};

const documentAttributes = { exclude: ["fileData"] };

// POST /api/documents - patient uploads for self, doctor uploads for an accessible patient
router.post(
  "/",
  protect,
  authorize("patient", "doctor"),
  (req, res, next) =>
    upload.single("file")(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          message:
            error.code === "LIMIT_FILE_SIZE"
              ? "File must be 10 MB or smaller"
              : error.message,
        });
      }
      next();
    }),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Please select a document" });

      const patientId = req.user.role === "patient" ? req.user.id : req.body.patientId;
      if (!patientId || !(await canAccessPatient(req.user, patientId))) {
        return res.status(403).json({ message: "You cannot upload a document for this patient" });
      }

      const document = await PatientDocument.create({
        patientId,
        uploaderId: req.user.id,
        uploaderRole: req.user.role,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        fileData: req.file.buffer,
      });

      const populated = await PatientDocument.findByPk(document.id, {
        attributes: documentAttributes,
        include: [{ model: User, as: "documentUploader", attributes: ["id", "name", "role"] }],
      });
      res.status(201).json(populated);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/documents?patientId= - view all documents for one patient
router.get(
  "/",
  protect,
  authorize("patient", "doctor"),
  async (req, res) => {
    try {
      const patientId = req.user.role === "patient" ? req.user.id : req.query.patientId;
      if (!patientId || !(await canAccessPatient(req.user, patientId))) {
        return res.status(403).json({ message: "You cannot view documents for this patient" });
      }

      const documents = await PatientDocument.findAll({
        where: { patientId },
        attributes: documentAttributes,
        include: [{ model: User, as: "documentUploader", attributes: ["id", "name", "role"] }],
        order: [["createdAt", "DESC"]],
      });
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/documents/:id/download - authenticated download/view
router.get(
  "/:id/download",
  protect,
  authorize("patient", "doctor"),
  async (req, res) => {
    try {
      const document = await PatientDocument.findByPk(req.params.id);
      if (!document || !(await canAccessPatient(req.user, document.patientId))) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.setHeader("Content-Type", document.mimeType);
      res.setHeader("Content-Length", document.fileSize);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(document.originalName)}"`
      );
      res.send(document.fileData);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
