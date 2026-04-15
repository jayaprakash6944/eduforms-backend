const express = require("express");
const router  = express.Router();
const {
  submitApplication, getApplications, getApplication,
  getMyStats, actionApplication, getAnalytics,
  getPrediction, checkDuplicate,
} = require("../controllers/applicationController");
const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");

// named routes BEFORE /:id
router.get("/analytics",        protect, authorize("college_admin","hod","college_director","placement_director"), getAnalytics);
router.get("/mystats",          protect, authorize("student"), getMyStats);
router.get("/predict",          protect, getPrediction);
router.get("/check-duplicate",  protect, checkDuplicate);

router.post("/", protect, authorize("student","faculty"), upload.array("attachments", 5), submitApplication);
router.get("/",  protect, getApplications);
router.get("/:id", protect, getApplication);
router.put("/:id/action", protect, actionApplication);

module.exports = router;