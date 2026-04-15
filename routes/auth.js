const express = require("express");
const router  = express.Router();
const {
  login, verifyLoginOTP, resendOTP,
  forgotPassword, verifyResetOTP, resetPassword,
  getMe, changePassword, register,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Auth flows
router.post("/register",         register);
router.post("/login",            login);
router.post("/verify-otp",       verifyLoginOTP);
router.post("/resend-otp",       resendOTP);

// Forgot / Reset password
router.post("/forgot-password",  forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password",   resetPassword);

// Protected
router.get("/me",                protect, getMe);
router.put("/change-password",   protect, changePassword);

module.exports = router;