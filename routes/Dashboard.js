const express = require("express");
const router  = express.Router();
const { studentDashboard, staffDashboard } = require("../controllers/Dashboardcontroller");
const { protect } = require("../middleware/auth");

router.get("/student", protect, studentDashboard);
router.get("/staff",   protect, staffDashboard);

module.exports = router;