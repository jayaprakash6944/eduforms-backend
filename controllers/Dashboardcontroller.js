const Application  = require("../models/Application");
const Notification = require("../models/Notification");
const User         = require("../models/User");

// @GET /api/dashboard/student  – stats for student dashboard
const studentDashboard = async (req, res) => {
  try {
    const studentId = req.user._id;
    const apps = await Application.find({ student: studentId });

    const stats = {
      total:    apps.length,
      approved: apps.filter(a => a.status === "approved").length,
      pending:  apps.filter(a => ["pending","in-review"].includes(a.status)).length,
      rejected: apps.filter(a => a.status === "rejected").length,
    };

    const recent = await Application.find({ student: studentId })
      .sort({ createdAt: -1 }).limit(3)
      .populate("formTemplate", "name category icon color");

    const unreadNotifs = await Notification.countDocuments({ user: studentId, read: false });

    res.json({ stats, recentApplications: recent, unreadNotifications: unreadNotifs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @GET /api/dashboard/staff  – stats for mentor/hod/admin/director
const staffDashboard = async (req, res) => {
  try {
    const { role } = req.user;

    // Applications pending this role
    const pendingCount = await Application.countDocuments({
      steps: { $elemMatch: { role, status: "pending" } }
    });

    const totalApps  = await Application.countDocuments();
    const approved   = await Application.countDocuments({ status: "approved" });
    const rejected   = await Application.countDocuments({ status: "rejected" });
    const unread     = await Notification.countDocuments({ user: req.user._id, read: false });

    // Recent pending for this role
    const recentPending = await Application.find({
      steps: { $elemMatch: { role, status: "pending" } }
    }).sort({ createdAt: -1 }).limit(5)
      .populate("student", "name rollNo dept")
      .populate("formTemplate", "name icon");

    // Monthly stats (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthly = await Application.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    res.json({ pendingCount, totalApps, approved, rejected, unread, recentPending, monthly });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { studentDashboard, staffDashboard };