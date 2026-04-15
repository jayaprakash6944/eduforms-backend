const FormTemplate = require("../models/FormTemplate");

// @GET /api/forms — auto-filter by caller's role
const getForms = async (req, res) => {
  try {
    const query = { isActive: true };

    // Filter by portal type based on caller role
    const role = req.user?.role;
    if (role === "faculty") {
      query.portalType = { $in: ["faculty", "both"] };
    } else if (role === "student") {
      query.portalType = { $in: ["student", "both"] };
    }
    // admins/hod/directors see all

    if (req.query.category && req.query.category !== "All") query.category = req.query.category;
    if (req.query.search) query.$or = [
      { name:        { $regex: req.query.search, $options: "i" } },
      { description: { $regex: req.query.search, $options: "i" } },
    ];

    const forms = await FormTemplate.find(query).sort({ popular: -1, name: 1 });
    res.json(forms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getForm = async (req, res) => {
  try {
    const form = await FormTemplate.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Form not found" });
    res.json(form);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createForm = async (req, res) => {
  try {
    const form = await FormTemplate.create(req.body);
    res.status(201).json(form);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateForm = async (req, res) => {
  try {
    const form = await FormTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!form) return res.status(404).json({ message: "Form not found" });
    res.json(form);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteForm = async (req, res) => {
  try {
    await FormTemplate.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: "Form template deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getForms, getForm, createForm, updateForm, deleteForm };