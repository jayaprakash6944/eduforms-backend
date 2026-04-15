const jwt          = require("jsonwebtoken");
const User         = require("../models/User");
const OTP          = require("../models/OTP");
const { sendOTPEmail } = require("../config/mailer");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || "7d" });

const makeOTP = () => String(Math.floor(100000 + Math.random() * 900000)); // 6-digit

const OTP_TTL = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 10);
  return d;
};

const formatUser = (user) => ({
  _id:    user._id,
  id:     user._id,
  name:        user.name,
  email:       user.email,
  role:        user.role,
  dept:        user.dept,
  year:        user.year,
  rollNo:      user.rollNo,
  employeeId:  user.employeeId,
  designation: user.designation,
  phone:       user.phone,
  course:      user.course,
  mentor:      user.mentor,
  avatar:      user.avatar,
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — POST /api/auth/login
// Validates credentials, sends OTP for 2FA
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid email or password" });

    // Generate OTP
    const otp = makeOTP();

    // Try to send OTP email — if SMTP fails, still proceed (OTP shown in terminal)
    try {
      await sendOTPEmail(user.email, otp, "login");
    } catch (mailErr) {
      // Email failed — log OTP in terminal so it can still be used
      console.log("\n" + "═".repeat(55));
      console.log(`  ⚠️  EMAIL FAILED — showing OTP in terminal`);
      console.log(`  To   : ${user.email}`);
      console.log(`  OTP  : ${otp}`);
      console.log(`  Fix  : Set correct EMAIL_USER and EMAIL_PASS in .env`);
      console.log("═".repeat(55) + "\n");
    }

    // Delete old OTPs for this email/type
    await OTP.deleteMany({ email: user.email, type: "login" });

    // Save new OTP (will be hashed by pre-save hook)
    await OTP.create({ email: user.email, otp, type: "login", expiresAt: OTP_TTL() });

    res.json({
      message:     "OTP sent to your registered email address",
      email:       user.email,
      requiresOTP: true,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — POST /api/auth/verify-otp
// Verifies 2FA OTP, returns JWT token
// ─────────────────────────────────────────────────────────────────────────────
const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });

    const record = await OTP.findOne({
      email: email.toLowerCase(),
      type:  "login",
      used:  false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record)
      return res.status(400).json({ message: "OTP expired or not found. Please login again." });

    const valid = await record.verifyOTP(otp);
    if (!valid)
      return res.status(400).json({ message: "Incorrect OTP. Please try again." });

    // Mark as used
    record.used = true;
    await record.save();

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.json({
      token: generateToken(user._id),
      user:  formatUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESEND OTP — POST /api/auth/resend-otp
// ─────────────────────────────────────────────────────────────────────────────
const resendOTP = async (req, res) => {
  try {
    const { email, type = "login" } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) return res.status(404).json({ message: "No account found for this email" });

    const otp = makeOTP();
    try {
      await sendOTPEmail(user.email, otp, type);
    } catch (mailErr) {
      console.log("\n" + "═".repeat(55));
      console.log(`  ⚠️  EMAIL FAILED — OTP for resend`);
      console.log(`  To  : ${user.email}`);
      console.log(`  OTP : ${otp}`);
      console.log("═".repeat(55) + "\n");
    }

    await OTP.deleteMany({ email: user.email, type });
    await OTP.create({ email: user.email, otp, type, expiresAt: OTP_TTL() });

    res.json({
      message: "New OTP sent",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD — POST /api/auth/forgot-password
// Sends reset OTP to email
// ─────────────────────────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });

    // Always respond the same way (don't reveal if email exists)
    if (!user) {
      return res.json({ message: "If this email is registered, you will receive an OTP." });
    }

    const otp = makeOTP();
    try {
      await sendOTPEmail(user.email, otp, "reset");
    } catch (mailErr) {
      console.log("\n" + "═".repeat(55));
      console.log(`  ⚠️  EMAIL FAILED — Reset OTP`);
      console.log(`  To  : ${user.email}`);
      console.log(`  OTP : ${otp}`);
      console.log("═".repeat(55) + "\n");
    }

    await OTP.deleteMany({ email: user.email, type: "reset" });
    await OTP.create({ email: user.email, otp, type: "reset", expiresAt: OTP_TTL() });

    res.json({
      message: "Password reset OTP sent to your email",
      email:   user.email,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY RESET OTP — POST /api/auth/verify-reset-otp
// Validates OTP, returns a short-lived reset token
// ─────────────────────────────────────────────────────────────────────────────
const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });

    const record = await OTP.findOne({
      email: email.toLowerCase(),
      type:  "reset",
      used:  false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record)
      return res.status(400).json({ message: "OTP expired or not found" });

    const valid = await record.verifyOTP(otp);
    if (!valid)
      return res.status(400).json({ message: "Incorrect OTP" });

    record.used = true;
    await record.save();

    // Issue a short-lived reset token (5 min)
    const resetToken = jwt.sign({ email: email.toLowerCase(), purpose: "reset" },
      process.env.JWT_SECRET, { expiresIn: "5m" });

    res.json({ message: "OTP verified", resetToken });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD — POST /api/auth/reset-password
// Uses reset token to set new password
// ─────────────────────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword)
      return res.status(400).json({ message: "Reset token and new password required" });

    if (newPassword.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Reset token expired. Please start over." });
    }

    if (decoded.purpose !== "reset")
      return res.status(400).json({ message: "Invalid reset token" });

    const user = await User.findOne({ email: decoded.email, isActive: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password reset successful. You can now login." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING ROUTES
// ─────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json({ user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ message: "Current password is incorrect" });
    user.password = newPassword;
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  login, verifyLoginOTP, resendOTP,
  forgotPassword, verifyResetOTP, resetPassword,
  getMe, changePassword,
};

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER — POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, role, dept, year, rollNo, designation, phone, course } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ message: "Name, email, password and role are required" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    // Roll number mandatory for students
    if (role === "student" && !rollNo?.trim())
      return res.status(400).json({ message: "Roll number is required for students" });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ message: "An account with this email already exists" });

    const user = await User.create({
      name, email, password, role,
      dept:        dept        || "",
      year:        year        || "",
      rollNo:      rollNo      || "",
      designation: designation || "",
      employeeId:  rollNo      || "",
      phone:       phone       || "",
      course:      course      || "",
      isActive: true,
    });

    console.log(`\n✅ New ${role} registered: ${user.email} (${dept || "no dept"})\n`);

    res.status(201).json({
      message: "Account created successfully. You can now sign in.",
      user: formatUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// append to exports
Object.assign(module.exports, { register });