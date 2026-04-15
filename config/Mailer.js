const nodemailer = require("nodemailer");

const isConfigured = () =>
  process.env.EMAIL_USER &&
  process.env.EMAIL_USER !== "your_gmail@gmail.com" &&
  process.env.EMAIL_PASS &&
  process.env.EMAIL_PASS !== "your_16_char_app_password";

const createTransporter = () => {
  if (!isConfigured()) return null;
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST || "smtp.gmail.com",
    port:   parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
};

const otpEmailHTML = (otp, type) => `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f5f2ed;padding:28px;border-radius:16px">
  <div style="text-align:center;margin-bottom:24px">
    <div style="width:60px;height:60px;background:#e85d26;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:30px">🎓</div>
    <h2 style="color:#0d1b2a;margin:12px 0 4px;font-size:22px">EduForms</h2>
    <p style="color:#8898aa;font-size:13px;margin:0">Digital College Forms Portal</p>
  </div>
  <div style="background:white;border-radius:14px;padding:32px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
    <h3 style="color:#0d1b2a;margin:0 0 8px;font-size:18px">
      ${type === "login" ? "🔐 Login Verification" : "🔑 Password Reset"}
    </h3>
    <p style="color:#4a5568;font-size:14px;margin-bottom:24px">
      ${type === "login" ? "Enter this code to complete your sign-in:" : "Enter this code to reset your password:"}
    </p>
    <div style="background:#fff5f0;border:2px dashed #e85d26;border-radius:14px;padding:20px 28px;display:inline-block;margin-bottom:24px">
      <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#e85d26;font-family:monospace">${otp}</span>
    </div>
    <p style="color:#8898aa;font-size:13px;margin:0">
      ⏱ Expires in <strong>10 minutes</strong><br/>
      <span style="font-size:12px;color:#aaa;margin-top:6px;display:block">Never share this code with anyone</span>
    </p>
  </div>
  <p style="text-align:center;color:#bbb;font-size:11px;margin-top:20px">
    If you didn't request this, please ignore this email — your account is safe.
  </p>
</div>`;

const sendOTPEmail = async (email, otp, type = "login") => {
  const subject = type === "login"
    ? "EduForms — Your 2FA Verification Code"
    : "EduForms — Password Reset Code";

  const transporter = createTransporter();

  if (!transporter) {
    // SMTP not configured — print in terminal only (not sent to frontend)
    console.log("\n" + "═".repeat(55));
    console.log(`  📧  OTP for ${email}`);
    console.log(`  Type : ${type.toUpperCase()}`);
    console.log(`  CODE : ${otp}`);
    console.log(`  ⚠️  Configure EMAIL_USER and EMAIL_PASS in .env to send real emails`);
    console.log("═".repeat(55) + "\n");
    // Return without devOtp — OTP stays in terminal only
    return { consoleOnly: true };
  }

  // Send real email to registered address
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || `"EduForms" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject,
    html:    otpEmailHTML(otp, type),
  });

  console.log(`✅ OTP email sent to ${email}`);
  return { consoleOnly: false };
};

module.exports = { sendOTPEmail };