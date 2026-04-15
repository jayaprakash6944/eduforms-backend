const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName:   { type: String, default: "" },
  userRole:   { type: String, default: "" },
  userDept:   { type: String, default: "" },
  userEmail:  { type: String, default: "" },
  type: {
    type: String,
    enum: ["missing_form","form_issue","suggestion","bug_report","other"],
    required: true,
  },
  category:   { type: String, default: "" },      // which form category it's about
  formName:   { type: String, default: "" },       // specific form name if any
  subject:    { type: String, required: true },
  message:    { type: String, required: true },
  priority:   { type: String, enum: ["low","medium","high"], default: "medium" },
  status:     { type: String, enum: ["open","in-progress","resolved","closed"], default: "open" },
  adminNote:  { type: String, default: "" },
  rating:     { type: Number, min: 1, max: 5, default: null },
}, { timestamps: true });

module.exports = mongoose.model("Feedback", feedbackSchema);