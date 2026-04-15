const mongoose = require("mongoose");

const stepSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  role:       { type: String, required: true },
  status:     { type: String, enum: ["waiting","pending","approved","rejected"], default: "waiting" },
  date:       { type: Date,   default: null },
  comment:    { type: String, default: "" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
});

// ── Feature 5: Collaborative Forms ───────────────────────────────────────────
const collaboratorSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name:      { type: String },
  email:     { type: String },
  sections:  [{ type: String }], // which fields they're responsible for
  completed: { type: Boolean, default: false },
  joinedAt:  { type: Date, default: Date.now },
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  appId:        { type: String, unique: true },
  student:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  formTemplate: { type: mongoose.Schema.Types.ObjectId, ref: "FormTemplate", required: true },
  formName:     { type: String, required: true },
  formData:     { type: mongoose.Schema.Types.Mixed, default: {} },
  remarks:      { type: String, default: "" },
  attachments: [{
    filename:     String,
    originalName: String,
    path:         String,
    mimetype:     String,
  }],
  status:      { type: String, enum: ["pending","in-review","approved","rejected","auto-approved","simulation"], default: "pending" },
  currentStep: { type: Number, default: 0 },
  totalSteps:  { type: Number, default: 0 },
  steps:       [stepSchema],
  dept:        { type: String, default: "" },
  category:    { type: String, default: "" },
  icon:        { type: String, default: "📄" },
  color:       { type: String, default: "#e85d26" },
  submittedOn: { type: Date, default: Date.now },
  // ── Feature 1: Smart Approval ─────────────────────────────────────────────
  autoApproved:  { type: Boolean, default: false },
  autoApproveReason: { type: String, default: "" },
  // ── Feature 3: Priority Routing ───────────────────────────────────────────
  priority:    { type: String, enum: ["low","medium","high"], default: "medium" },
  stepsSkipped:{ type: Number, default: 0 },
  // ── Feature 4: Simulation ─────────────────────────────────────────────────
  isSimulation:{ type: Boolean, default: false },
  // ── Feature 5: Collaborative Forms ───────────────────────────────────────
  isCollaborative:  { type: Boolean, default: false },
  collaborators:    [collaboratorSchema],
  collaborationCode:{ type: String, default: "" }, // share code for others to join
  allCollaboratorsReady: { type: Boolean, default: false },
}, { timestamps: true });

applicationSchema.pre("save", async function (next) {
  if (!this.appId) {
    const count = await mongoose.model("Application").countDocuments();
    this.appId  = `APP-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Application", applicationSchema);