const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  type:    { type: String, enum: ["approval","rejection","pending","reminder","info"], default: "info" },
  icon:    { type: String, default: "🔔" },
  read:    { type: Boolean, default: false },
  appId:   { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);