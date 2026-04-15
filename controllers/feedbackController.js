const Feedback     = require("../models/Feedback");
const Notification = require("../models/Notification");
const User         = require("../models/User");

// helper: notify all admins
const notifyAdmins = async ({ title, message, icon }) => {
  try {
    const admins = await User.find({ role: "college_admin", isActive: true }).select("_id");
    for (const a of admins) {
      await Notification.create({ user: a._id, title, message, type: "info", icon: icon || "💬", appId: "" });
    }
  } catch (e) { console.error("Admin notify error:", e.message); }
};

// POST /api/feedback  — student or faculty submits
const submitFeedback = async (req, res) => {
  try {
    const { type, category, formName, subject, message, priority, rating } = req.body;
    if (!type || !subject?.trim() || !message?.trim())
      return res.status(400).json({ message: "Type, subject and message are required" });

    const fb = await Feedback.create({
      user:      req.user._id,
      userName:  req.user.name,
      userRole:  req.user.role,
      userDept:  req.user.dept || "",
      userEmail: req.user.email,
      type, category: category || "", formName: formName || "",
      subject, message, priority: priority || "medium",
      rating: rating || null,
    });

    // ── Notify all college admins immediately ──────────────────────────────
    const typeLabels = {
      missing_form:"Missing Form", form_issue:"Form Issue",
      suggestion:"Suggestion", bug_report:"Bug Report", other:"Feedback"
    };
    await notifyAdmins({
      title:   `New ${typeLabels[type]||"Feedback"} from ${req.user.name}`,
      message: `${req.user.role} (${req.user.dept||req.user.email}) submitted: "${subject}"`,
      icon:    "💬",
    });

    console.log(`\n📬 Feedback from ${req.user.email}: [${type}] ${subject}\n`);
    res.status(201).json({ message: "Feedback submitted successfully", feedback: fb });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/feedback  — admin sees all; user sees their own
const getFeedback = async (req, res) => {
  try {
    const isAdmin = ["college_admin","college_director"].includes(req.user.role);
    const query   = isAdmin ? {} : { user: req.user._id };

    if (req.query.status && req.query.status !== "all") query.status = req.query.status;
    if (req.query.type   && req.query.type   !== "all") query.type   = req.query.type;

    const items = await Feedback.find(query)
      .populate("user", "name email role dept")
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/feedback/:id  — admin updates status / adds note
const updateFeedback = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const fb = await Feedback.findByIdAndUpdate(
      req.params.id, { status, adminNote }, { new: true }
    );
    if (!fb) return res.status(404).json({ message: "Feedback not found" });
    res.json({ message: "Feedback updated", feedback: fb });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/feedback/stats  — admin summary
const getFeedbackStats = async (req, res) => {
  try {
    const total      = await Feedback.countDocuments();
    const open       = await Feedback.countDocuments({ status: "open" });
    const inProgress = await Feedback.countDocuments({ status: "in-progress" });
    const resolved   = await Feedback.countDocuments({ status: "resolved" });
    const byType     = await Feedback.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);
    const byPriority = await Feedback.aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } }
    ]);
    res.json({ total, open, inProgress, resolved, byType, byPriority });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/feedback/open-count  — admin badge count
const getOpenCount = async (req, res) => {
  try {
    const count = await Feedback.countDocuments({ status: "open" });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { submitFeedback, getFeedback, updateFeedback, getFeedbackStats, getOpenCount };