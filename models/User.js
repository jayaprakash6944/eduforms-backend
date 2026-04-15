const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema({
  phone:       { type: String, default: "" },
  course:      { type: String, default: "" },
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:    { type: String, required: true, minlength: 6 },
  role: {
    type: String,
    enum: ["student","faculty","mentor","hod","college_admin","placement_director","college_director","exam_branch"],
    required: true,
  },
  dept:        { type: String, default: "" },
  year:        { type: String, default: "" },
  rollNo:      { type: String, default: "" },
  mentor:      { type: String, default: "" },
  avatar:      { type: String, default: "" },
  isActive:    { type: Boolean, default: true },
  designation: { type: String, default: "" },
  employeeId:  { type: String, default: "" },
}, { timestamps: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("User", userSchema);