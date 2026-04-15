const express = require("express");
const router  = express.Router();
const { submitFeedback, getFeedback, updateFeedback, getFeedbackStats, getOpenCount } = require("../controllers/feedbackController");
const { protect, authorize } = require("../middleware/auth");

router.post("/",           protect, submitFeedback);
router.get("/",            protect, getFeedback);
router.get("/stats",       protect, authorize("college_admin","college_director"), getFeedbackStats);
router.get("/open-count",  protect, authorize("college_admin","college_director"), getOpenCount);
router.put("/:id",         protect, authorize("college_admin","college_director"), updateFeedback);

module.exports = router;