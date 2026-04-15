const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const otpSchema = new mongoose.Schema({
  email:     { type: String, required: true, lowercase: true },
  otp:       { type: String, required: true },
  type:      { type: String, enum: ["login", "reset"], required: true },
  expiresAt: { type: Date, required: true },
  used:      { type: Boolean, default: false },
}, { timestamps: true });

// Auto-delete expired documents
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Hash before save
otpSchema.pre("save", async function (next) {
  if (this.isModified("otp")) {
    const salt = await bcrypt.genSalt(10);
    this.otp   = await bcrypt.hash(this.otp, salt);
  }
  next();
});

otpSchema.methods.verifyOTP = async function (entered) {
  return bcrypt.compare(String(entered), this.otp);
};

module.exports = mongoose.model("OTP", otpSchema);