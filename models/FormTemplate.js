const mongoose = require("mongoose");

const formTemplateSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  category:    { type: String, required: true },
  description: { type: String, default: "" },
  icon:        { type: String, default: "📄" },
  color:       { type: String, default: "#e85d26" },
  popular:     { type: Boolean, default: false },
  time:        { type: String, default: "3-5 days" },
  fields:      [{ type: String }],
  signatories: [{ type: String }],
  portalType:  { type: String, enum: ["student","faculty","both"], default: "student" },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("FormTemplate", formTemplateSchema);