const express = require("express");
const { Op } = require("sequelize");
const { User, PatientVitals } = require("../models");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

const safeUserAttributes = { exclude: ["password"] };

const getDoctorPatientIds = async (doctorId) => {
  const assignedPatients = await User.findAll({
    where: { role: "patient", assignedDoctor: doctorId },
    attributes: ["id"],
    raw: true,
  });

  const engagedRows = await PatientVitals.findAll({
    where: { doctorId },
    attributes: ["patientId"],
    group: ["patientId"],
    raw: true,
  });

  return [...new Set([
    ...assignedPatients.map((p) => p.id),
    ...engagedRows.map((row) => row.patientId),
  ])];
};

const canDoctorAccessPatient = async (doctorId, patientId) => {
  const patient = await User.findOne({
    where: { id: patientId, role: "patient" },
  });

  if (!patient) {
    return { patient: null, allowed: false };
  }

  if (String(patient.assignedDoctor) === String(doctorId)) {
    return { patient, allowed: true };
  }

  const hasClinicalRecord = await PatientVitals.count({
    where: { patientId, doctorId },
  });

  return { patient, allowed: hasClinicalRecord > 0 };
};

const isPendingReview = (record) => {
  return (
    record.reviewStatus === "pending" ||
    (!record.reviewStatus && record.submittedBy === "patient" && !record.prescription)
  );
};

// GET /api/doctor/patients - Get patients assigned to or engaged with this doctor
router.get(
  "/patients",
  protect,
  authorize("doctor"),
  async (req, res) => {
    try {
      const patientIds = await getDoctorPatientIds(req.user.id);

      if (patientIds.length === 0) {
        return res.json([]);
      }

      const patients = await User.findAll({
        where: {
          id: { [Op.in]: patientIds },
          role: "patient",
        },
        attributes: safeUserAttributes,
        order: [["createdAt", "DESC"]],
      });
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/doctor/patients/:id - Get single patient details with vitals
router.get(
  "/patients/:id",
  protect,
  authorize("doctor"),
  async (req, res) => {
    try {
      const { patient, allowed } = await canDoctorAccessPatient(req.user.id, req.params.id);

      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      if (!allowed) {
        return res.status(403).json({ message: "This patient is not assigned to you" });
      }

      const vitals = await PatientVitals.findAll({
        where: {
          patientId: req.params.id,
        },
        include: [
          {
            model: User,
            as: "doctorInfo",
            attributes: ["name"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      res.json({ patient: patient.toSafeJSON(), vitals });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// POST /api/doctor/vitals - Add vitals/prescription for a patient
router.post(
  "/vitals",
  protect,
  authorize("doctor"),
  async (req, res) => {
    try {
      const {
        patientId,
        systolic,
        diastolic,
        pulse,
        oxygen,
        temperature,
        prescription,
        notes,
      } = req.body;

      const { patient, allowed } = await canDoctorAccessPatient(req.user.id, patientId);

      if (!patient) {
        return res
          .status(404)
          .json({ message: "Patient not found" });
      }

      if (!allowed) {
        return res.status(403).json({ message: "This patient is not assigned to you" });
      }

      const vitals = await PatientVitals.create({
        patientId,
        doctorId: req.user.id,
        systolic,
        diastolic,
        pulse,
        oxygen,
        temperature,
        prescription,
        notes,
        patientNotes: "",
        submittedBy: "doctor",
        reviewStatus: "reviewed",
      });

      const populatedVitals = await PatientVitals.findByPk(vitals.id, {
        include: [
          { model: User, as: "doctorInfo", attributes: ["name"] },
          { model: User, as: "patient", attributes: ["name"] },
        ],
      });

      res.status(201).json(populatedVitals);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// PUT /api/doctor/patients/:id - Update patient information (disease, etc.)
router.put(
  "/patients/:id",
  protect,
  authorize("doctor"),
  async (req, res) => {
    try {
      const { age, height, weight, disease, contactNo } = req.body;
      
      const { patient, allowed } = await canDoctorAccessPatient(req.user.id, req.params.id);

      if (!patient) {
        return res
          .status(404)
          .json({ message: "Patient not found" });
      }

      if (!allowed) {
        return res.status(403).json({ message: "This patient is not assigned to you" });
      }

      await User.update(
        { age, height, weight, disease, contactNo },
        { where: { id: req.params.id } }
      );

      const updatedPatient = await User.findByPk(req.params.id, {
        attributes: safeUserAttributes,
      });

      res.json(updatedPatient);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET /api/doctor/stats - Get doctor dashboard stats
router.get(
  "/stats",
  protect,
  authorize("doctor"),
  async (req, res) => {
    try {
      const totalPatients = (await getDoctorPatientIds(req.user.id)).length;

      const totalRecords = await PatientVitals.count({
        where: {
          doctorId: req.user.id,
        },
      });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayRecords = await PatientVitals.count({
        where: {
          doctorId: req.user.id,
          createdAt: { [Op.gte]: todayStart },
        },
      });

      const pendingReviews = await PatientVitals.count({
        where: {
          doctorId: req.user.id,
          [Op.or]: [
            { reviewStatus: "pending" },
            { reviewStatus: null, submittedBy: "patient", prescription: "" },
          ],
        },
      });

      res.json({ totalPatients, totalRecords, todayRecords, pendingReviews });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// PUT /api/doctor/vitals/:id - Update a vitals/prescription record
router.put(
  "/vitals/:id",
  protect,
  authorize("doctor"),
  async (req, res) => {
    try {
      const { systolic, diastolic, pulse, oxygen, temperature, prescription, notes } = req.body;
      const record = await PatientVitals.findByPk(req.params.id);

      if (!record) {
        return res.status(404).json({ message: "Record not found" });
      }

      // Ensure the logged-in doctor created this record
      if (record.doctorId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this record" });
      }

      const shouldMarkReviewed =
        isPendingReview(record) &&
        (prescription !== undefined || notes !== undefined);

      if (
        isPendingReview(record) &&
        !(prescription || notes || record.prescription || record.notes)
      ) {
        return res.status(400).json({ message: "Add medicines or doctor advice before marking the request reviewed" });
      }

      await record.update({
        systolic: systolic !== undefined ? systolic : record.systolic,
        diastolic: diastolic !== undefined ? diastolic : record.diastolic,
        pulse: pulse !== undefined ? pulse : record.pulse,
        oxygen: oxygen !== undefined ? oxygen : record.oxygen,
        temperature: temperature !== undefined ? temperature : record.temperature,
        prescription: prescription !== undefined ? prescription : record.prescription,
        notes: notes !== undefined ? notes : record.notes,
        reviewStatus: shouldMarkReviewed ? "reviewed" : record.reviewStatus,
      });

      res.json(record);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// DELETE /api/doctor/vitals/:id - Delete a vitals/prescription record
router.delete(
  "/vitals/:id",
  protect,
  authorize("doctor"),
  async (req, res) => {
    try {
      const record = await PatientVitals.findByPk(req.params.id);

      if (!record) {
        return res.status(404).json({ message: "Record not found" });
      }

      // Ensure the logged-in doctor created this record
      if (record.doctorId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this record" });
      }

      await record.destroy();
      res.json({ message: "Record deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
