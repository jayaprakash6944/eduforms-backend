// ─────────────────────────────────────────────────────────────────────────────
// approvalEngine.js — Smart Approval Automation + Priority-Based Routing
// Feature 1: Auto-Decision System
// Feature 3: Priority-Based Routing
// ─────────────────────────────────────────────────────────────────────────────

// ── PRIORITY RULES ────────────────────────────────────────────────────────────
// Determines priority from form type and data
function detectPriority(template, formData) {
  const name  = (template.name  || "").toLowerCase();
  const cat   = (template.category || "").toLowerCase();
  const data  = JSON.stringify(formData || "").toLowerCase();

  // HIGH priority conditions
  if (name.includes("medical") || data.includes("hospital") || data.includes("surgery") || data.includes("emergency"))
    return { level: "high", reason: "Medical emergency detected" };
  if (name.includes("hall ticket") || name.includes("supplementary"))
    return { level: "high", reason: "Exam-critical request" };
  if (data.includes("urgent") || data.includes("emergency") || data.includes("critical"))
    return { level: "high", reason: "Marked urgent by applicant" };

  // LOW priority conditions
  if (name.includes("library") || name.includes("club") || name.includes("bus pass"))
    return { level: "low", reason: "Routine administrative request" };

  return { level: "medium", reason: "Standard request" };
}

// ── AUTO-DECISION RULES ───────────────────────────────────────────────────────
// Returns { decision: "approve"|"forward"|"none", reason, skipSteps }
function runApprovalEngine(template, formData, user, manualPriority) {
  const name     = (template.name || "").toLowerCase();
  const cat      = (template.category || "").toLowerCase();
  const data     = JSON.stringify(formData || "").toLowerCase();
  const priority = manualPriority || detectPriority(template, formData).level;

  // ── AUTO-APPROVE rules ──────────────────────────────────────────────────────

  // Bus pass — always auto-approve
  if (name.includes("bus pass") || name.includes("library membership"))
    return { decision: "approve", reason: "Auto-approved: Standard facility request — no review needed", skipSteps: 0 };

  // Book issue — auto-approve
  if (name.includes("book issue"))
    return { decision: "approve", reason: "Auto-approved: Library book issue request", skipSteps: 0 };

  // Short leave (1 day) with no documents required
  if ((name.includes("leave") || name.includes("casual")) && !name.includes("medical")) {
    const duration = (formData["Duration"] || formData["duration"] || "").toLowerCase();
    if (duration.includes("1 day") || duration === "1") {
      return { decision: "approve", reason: "Auto-approved: Single-day leave requests are pre-approved", skipSteps: 0 };
    }
  }

  // Course registration — auto-approve if elective
  if (name.includes("course registration"))
    return { decision: "approve", reason: "Auto-approved: Course registration is automatically processed", skipSteps: 0 };

  // Club activity — auto-approve
  if (name.includes("club activity"))
    return { decision: "approve", reason: "Auto-approved: Club activity participation", skipSteps: 0 };

  // ── PRIORITY SKIP rules ─────────────────────────────────────────────────────

  // High priority: skip mentor, go directly to HOD
  if (priority === "high") {
    if (name.includes("medical") || name.includes("hall ticket") || name.includes("supplementary")) {
      return { decision: "skip", reason: "High priority: Medical/Exam-critical — routed directly to HOD", skipSteps: 1 };
    }
    return { decision: "skip", reason: "High priority request — routed to HOD for faster processing", skipSteps: 1 };
  }

  // Exam branch forms — skip directly to relevant approver
  if (name.includes("transcript") || name.includes("degree certificate") || name.includes("consolidated"))
    return { decision: "none", reason: "Standard exam branch workflow", skipSteps: 0 };

  return { decision: "none", reason: "Standard approval workflow", skipSteps: 0 };
}

// ── APPLY AUTO-APPROVAL ───────────────────────────────────────────────────────
function applyAutoApproval(steps, reason) {
  return steps.map(s => ({
    ...s,
    status:    "approved",
    date:      new Date(),
    comment:   reason,
    approvedBy: null,
  }));
}

// ── APPLY PRIORITY SKIP ───────────────────────────────────────────────────────
function applyPrioritySkip(steps, skipCount, reason) {
  return steps.map((s, i) => {
    if (i < skipCount) {
      return { ...s, status: "approved", date: new Date(), comment: `[AUTO-SKIP] ${reason}` };
    }
    if (i === skipCount) {
      return { ...s, status: "pending" };
    }
    return { ...s, status: "waiting" };
  });
}

module.exports = { runApprovalEngine, applyAutoApproval, applyPrioritySkip, detectPriority };