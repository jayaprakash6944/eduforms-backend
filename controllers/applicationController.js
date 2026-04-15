const Application  = require("../models/Application");
const FormTemplate = require("../models/FormTemplate");
const Notification = require("../models/Notification");
const User         = require("../models/User");

// Signatory label → role key mapping
const ROLE_MAP = {
  "Mentor":             "mentor",
  "HOD":                "hod",
  "College Director":   "college_director",
  "Placement Director": "placement_director",
  "College Admin":      "college_admin",
  "Exam Branch":        "exam_branch",
};

// Roles that are department-scoped (should only see their own dept's applications)
const DEPT_SCOPED_ROLES = ["mentor", "hod"];

// ── Helper: notify a single user ─────────────────────────────────────────────
const notify = async (userId, { title, message, type, icon, appId }) => {
  try {
    await Notification.create({
      user:    userId,
      title,
      message,
      type:    type  || "info",
      icon:    icon  || "🔔",
      appId:   appId || "",
    });
  } catch (e) {
    console.error("Notification error:", e.message);
  }
};

// ── Helper: notify users of a role in a SPECIFIC department ──────────────────
// Used for mentor and HOD notifications so only the correct dept is notified.
const notifyDeptRole = async (role, dept, notifData) => {
  const filter = { role, isActive: true };
  // Only filter by dept for dept-scoped roles
  if (DEPT_SCOPED_ROLES.includes(role) && dept) {
    filter.dept = dept;
  }
  const users = await User.find(filter).select("_id");
  for (const u of users) await notify(u._id, notifData);
};

// ── Helper: notify ALL users of a role (for non-dept-scoped roles) ────────────
// Used for College Director, Placement Director, College Admin
const notifyRole = async (role, notifData) => {
  const users = await User.find({ role, isActive: true }).select("_id");
  for (const u of users) await notify(u._id, notifData);
};

// ── Smart notify: dept-scoped for mentor/hod, global for others ──────────────
const notifyNext = async (role, dept, notifData) => {
  if (DEPT_SCOPED_ROLES.includes(role)) {
    await notifyDeptRole(role, dept, notifData);
  } else {
    // exam_branch, college_director, placement_director etc. — notify all
    await notifyRole(role, notifData);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @POST /api/applications
// ────────────────────────────────────────────────────────────────────────────
const submitApplication = async (req, res) => {
  try {
    const { formTemplateId, formData, remarks } = req.body;

    if (!formTemplateId)
      return res.status(400).json({ message: "formTemplateId is required" });

    const template = await FormTemplate.findById(formTemplateId);
    if (!template)
      return res.status(404).json({ message: "Form template not found" });

    // ── Require approvalEngine ───────────────────────────────────────────────
    const { runApprovalEngine, applyAutoApproval, applyPrioritySkip } = require("../utils/approvalEngine");

    // Build approval chain steps
    let steps = template.signatories.map((label, i) => ({
      name:   label,
      role:   ROLE_MAP[label] || label.toLowerCase().replace(/\s+/g, "_"),
      status: i === 0 ? "pending" : "waiting",
    }));

    const attachments = (req.files || []).map(f => ({
      filename:     f.filename,
      originalName: f.originalname,
      path:         f.path,
      mimetype:     f.mimetype,
    }));

    let parsedFormData = {};
    if (formData) {
      try {
        const raw = typeof formData === "string" ? JSON.parse(formData) : formData;
        if (raw && typeof raw === "object") {
          Object.entries(raw).forEach(([k, v]) => { parsedFormData[k] = String(v ?? ""); });
        }
      } catch { parsedFormData = {}; }
    }

    // ── Feature 1 + 3: Run smart approval engine ──────────────────────────
    const priority = req.body.priority || template.defaultPriority || "medium";
    const engine   = runApprovalEngine(template, parsedFormData, req.user, priority);

    let finalStatus   = "pending";
    let autoApproved  = false;
    let stepsSkipped  = 0;
    let autoReason    = "";

    if (engine.decision === "approve") {
      steps        = applyAutoApproval(steps, engine.reason);
      finalStatus  = "approved";
      autoApproved = true;
      autoReason   = engine.reason;
    } else if (engine.skipSteps > 0) {
      steps        = applyPrioritySkip(steps, engine.skipSteps, engine.reason);
      finalStatus  = "in-review";
      stepsSkipped = engine.skipSteps;
      autoReason   = engine.reason;
    }

    const currentStep = autoApproved ? steps.length - 1 : stepsSkipped;
    const studentDept = req.user.dept || "";

    const application = await Application.create({
      student:      req.user._id,
      formTemplate: template._id,
      formName:     template.name,
      category:     template.category,
      icon:         template.icon,
      color:        template.color,
      formData:     parsedFormData,
      remarks:      remarks || "",
      attachments,
      steps,
      totalSteps:   steps.length,
      dept:         studentDept,
      status:       finalStatus,
      currentStep,
      priority,
      autoApproved,
      autoApproveReason: autoReason,
      stepsSkipped,
    });

    // Notify student
    const notifMsg = autoApproved
      ? `🎉 Your ${template.name} (${application.appId}) was automatically approved!`
      : stepsSkipped > 0
        ? `Your ${template.name} (${application.appId}) submitted. High priority — skipped ${stepsSkipped} step(s).`
        : `Your ${template.name} (${application.appId}) submitted. Pending review from ${steps[currentStep]?.name || "approver"}.`;

    await notify(req.user._id, {
      title:   autoApproved ? `${template.name} Auto-Approved! 🎉` : `${template.name} Submitted ✅`,
      message: notifMsg,
      type:    autoApproved ? "approved" : "pending",
      icon:    autoApproved ? "✅" : "📋",
      appId:   application.appId,
    });

    // Notify next approver (if not auto-approved)
    if (!autoApproved && steps[currentStep]?.role) {
      await notifyNext(steps[currentStep].role, studentDept, {
        title:   `New${priority === "high" ? " 🔴 HIGH PRIORITY" : ""} Application: ${template.name}`,
        message: `${req.user.name} (${req.user.rollNo || studentDept}) submitted a ${template.name}.${priority === "high" ? " ⚡ HIGH PRIORITY — please review urgently." : ""}`,
        type:    "pending",
        icon:    priority === "high" ? "🔴" : "⏳",
        appId:   application.appId,
      });
    }

    const populated = await Application.findById(application._id)
      .populate("student",      "name rollNo dept email avatar year")
      .populate("formTemplate", "name category icon color signatories fields");

    res.status(201).json(populated);

  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @GET /api/applications
// ── Department-filtered for mentor/hod ────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────
const getApplications = async (req, res) => {
  try {
    const { role, _id, dept } = req.user;
    let query = {};

    if (role === "student" || role === "faculty") {
      // Students AND faculty only see their OWN submitted applications
      query.student = _id;

    } else if (DEPT_SCOPED_ROLES.includes(role)) {
      // Mentors and HODs: department-scoped
      query.dept = dept;

      if (req.query.pending === "true") {
        // Pending Approvals: only apps where this role has a pending step
        query.steps = { $elemMatch: { role, status: "pending" } };

      } else if (req.query.history === "true") {
        // Approval History: only apps where this role has already acted (approved or rejected)
        query.steps = { $elemMatch: { role, status: { $in: ["approved", "rejected"] } } };

      }
      // else: all dept applications (all-applications view)

    } else {
      // College Director, Placement Director, College Admin, Exam Branch — see all
      if (req.query.pending === "true") {
        query.steps = { $elemMatch: { role, status: "pending" } };
      } else if (req.query.history === "true") {
        query.steps = { $elemMatch: { role, status: { $in: ["approved","rejected"] } } };
      }
    }

    if (req.query.status) query.status = req.query.status;

    const apps = await Application.find(query)
      .populate("student",      "name rollNo dept email avatar year")
      .populate("formTemplate", "name category icon color")
      .sort({ createdAt: -1 });

    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @GET /api/applications/:id
// ────────────────────────────────────────────────────────────────────────────
const getApplication = async (req, res) => {
  try {
    const app = await Application.findById(req.params.id)
      .populate("student",      "name rollNo dept email avatar year")
      .populate("formTemplate", "name category icon color signatories fields");

    if (!app) return res.status(404).json({ message: "Application not found" });

    // Department access check: mentor/hod can only see their own dept
    const { role, dept } = req.user;
    if (DEPT_SCOPED_ROLES.includes(role) && app.dept && app.dept !== dept) {
      return res.status(403).json({ message: "Access denied: application is from a different department" });
    }

    res.json(app);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @GET /api/applications/mystats  (student)
// ────────────────────────────────────────────────────────────────────────────
const getMyStats = async (req, res) => {
  try {
    const apps = await Application.find({ student: req.user._id });
    res.json({
      total:    apps.length,
      approved: apps.filter(a => a.status === "approved").length,
      pending:  apps.filter(a => ["pending","in-review"].includes(a.status)).length,
      rejected: apps.filter(a => a.status === "rejected").length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @PUT /api/applications/:id/action
// ────────────────────────────────────────────────────────────────────────────
const actionApplication = async (req, res) => {
  try {
    const { action, comment } = req.body;

    if (!["approve", "reject"].includes(action))
      return res.status(400).json({ message: "action must be 'approve' or 'reject'" });

    if (action === "reject" && !comment?.trim())
      return res.status(400).json({ message: "Comment is required for rejection" });

    const app = await Application.findById(req.params.id)
      .populate("student", "name rollNo _id dept");

    if (!app)
      return res.status(404).json({ message: "Application not found" });

    if (["approved","rejected"].includes(app.status))
      return res.status(400).json({ message: `Application already ${app.status}` });

    // Department access check for dept-scoped roles
    const { role, dept } = req.user;
    if (DEPT_SCOPED_ROLES.includes(role) && app.dept && app.dept !== dept) {
      return res.status(403).json({ message: "Access denied: this application belongs to a different department" });
    }

    // Find this approver's pending step
    const stepIdx = app.steps.findIndex(
      s => s.role === role && s.status === "pending"
    );

    if (stepIdx === -1)
      return res.status(403).json({ message: "No pending step for your role on this application" });

    // Update the step
    app.steps[stepIdx].status     = action === "approve" ? "approved" : "rejected";
    app.steps[stepIdx].date       = new Date();
    app.steps[stepIdx].comment    = comment || "";
    app.steps[stepIdx].approvedBy = req.user._id;

    const appDept = app.dept || "";   // the application's department (student's dept)

    if (action === "reject") {
      app.status = "rejected";

      await notify(app.student._id, {
        title:   `${app.formName} Rejected ❌`,
        message: `Your ${app.formName} (${app.appId}) was rejected by ${app.steps[stepIdx].name}. Reason: ${comment}`,
        type:    "rejection",
        icon:    "❌",
        appId:   app.appId,
      });

    } else {
      const nextStep = app.steps[stepIdx + 1];

      if (nextStep) {
        nextStep.status = "pending";
        app.status      = "in-review";
        app.currentStep = stepIdx + 1;

        // ── Notify next approver — department-scoped for mentor/HOD ──────────
        await notifyNext(nextStep.role, appDept, {
          title:   `Action Required: ${app.formName}`,
          message: `${app.student.name}'s ${app.formName} (${app.appId}) [Dept: ${appDept || "N/A"}] was approved by ${app.steps[stepIdx].name}. Your review is needed.`,
          type:    "pending",
          icon:    "⏳",
          appId:   app.appId,
        });

        await notify(app.student._id, {
          title:   `${app.formName} Moving Forward 🔄`,
          message: `Your ${app.formName} (${app.appId}) was approved by ${app.steps[stepIdx].name} and is now with ${nextStep.name}.`,
          type:    "pending",
          icon:    "🔄",
          appId:   app.appId,
        });

      } else {
        // All steps approved
        app.status      = "approved";
        app.currentStep = app.steps.length;

        await notify(app.student._id, {
          title:   `${app.formName} Fully Approved! 🎉`,
          message: `Congratulations! Your ${app.formName} (${app.appId}) has been fully approved by all ${app.steps.length} approver(s).`,
          type:    "approval",
          icon:    "✅",
          appId:   app.appId,
        });
      }
    }

    await app.save();

    const updated = await Application.findById(app._id)
      .populate("student",      "name rollNo dept email avatar")
      .populate("formTemplate", "name category icon color");

    res.json({ message: `Application ${action}d successfully`, application: updated });

  } catch (err) {
    console.error("Action error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @GET /api/applications/analytics
// ────────────────────────────────────────────────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    // Dept-scoped roles only see analytics for their dept
    const matchFilter = {};
    if (DEPT_SCOPED_ROLES.includes(req.user.role) && req.user.dept) {
      matchFilter.dept = req.user.dept;
    }

    const total    = await Application.countDocuments(matchFilter);
    const approved = await Application.countDocuments({ ...matchFilter, status: "approved" });
    const pending  = await Application.countDocuments({ ...matchFilter, status: { $in: ["pending","in-review"] } });
    const rejected = await Application.countDocuments({ ...matchFilter, status: "rejected" });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthly = await Application.aggregate([
      { $match: { ...matchFilter, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { "_id": 1 } },
    ]);

    const byCategory = await Application.aggregate([
      { $match: matchFilter },
      { $lookup: { from: "formtemplates", localField: "formTemplate", foreignField: "_id", as: "form" } },
      { $unwind: { path: "$form", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$form.category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ total, approved, pending, rejected, monthly, byCategory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  submitApplication,
  getApplications,
  getApplication,
  getMyStats,
  actionApplication,
  getAnalytics,
};

// ─────────────────────────────────────────────────────────────────────────────
// @GET /api/applications/predict?formName=xxx
// Returns approval probability + avg time for a specific form type
// ─────────────────────────────────────────────────────────────────────────────
const getPrediction = async (req, res) => {
  try {
    const { formName } = req.query;
    if (!formName) return res.status(400).json({ message: "formName required" });

    const query = { formName: { $regex: formName, $options: "i" } };
    const all      = await Application.find(query).select("status steps createdAt").lean();
    const total    = all.length;
    const approved = all.filter(a => a.status === "approved").length;
    const rejected = all.filter(a => a.status === "rejected").length;

    // Average days from submission to full approval
    const approvedApps = all.filter(a => a.status === "approved");
    let avgDays = null;
    if (approvedApps.length > 0) {
      const totalMs = approvedApps.reduce((sum, a) => {
        const lastStep = (a.steps || []).filter(s => s.date).pop();
        if (!lastStep) return sum;
        return sum + (new Date(lastStep.date) - new Date(a.createdAt));
      }, 0);
      avgDays = Math.round((totalMs / approvedApps.length) / (1000 * 60 * 60 * 24));
    }

    const probability = total === 0 ? null : Math.round((approved / (approved + rejected)) * 100);

    res.json({
      total, approved, rejected,
      probability,   // % chance of approval (null if no history)
      avgDays,       // avg days to get approved (null if no history)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

Object.assign(module.exports, { getPrediction });

// ─────────────────────────────────────────────────────────────────────────────
// @GET /api/applications/check-duplicate?formTemplateId=xxx&studentId=xxx
// Returns whether student already has a pending/recent application for this form
// ─────────────────────────────────────────────────────────────────────────────
const checkDuplicate = async (req, res) => {
  try {
    const { formTemplateId } = req.query;
    const studentId = req.user._id;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const existing = await Application.findOne({
      student: studentId,
      formTemplate: formTemplateId,
      status: { $in: ["pending", "in-review"] },
    }).select("appId status submittedOn formName").lean();

    const recent = await Application.findOne({
      student: studentId,
      formTemplate: formTemplateId,
      createdAt: { $gte: sevenDaysAgo },
    }).select("appId status submittedOn formName").lean();

    res.json({
      hasPending: !!existing,
      hasRecent:  !!recent && !existing,
      existing:   existing || recent || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

Object.assign(module.exports, { checkDuplicate });