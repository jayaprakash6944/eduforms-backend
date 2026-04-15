const User = require("../models/User");

// @GET /api/users
const getUsers = async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.query.role) query.role = req.query.role;
    const users = await User.find(query).select("-password").sort({ role: 1, name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @POST /api/users  (admin only)
const createUser = async (req, res) => {
  try {
    const exists = await User.findOne({ email: req.body.email });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    const avatar = req.body.name
      ? req.body.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
      : "U";

    const user = await User.create({ ...req.body, avatar });
    const { password: _, ...safe } = user.toObject();
    res.status(201).json(safe);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @PUT /api/users/:id  (admin only)
const updateUser = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, rest, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @DELETE /api/users/:id  (admin only, soft delete)
const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: "User deactivated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };