const express = require("express");
const router  = express.Router();
const { getNotifications, getUnreadCount, markRead, markAllRead } = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

// read-all must be before /:id
router.get("/",            protect, getNotifications);
router.get("/unread-count",protect, getUnreadCount);
router.put("/read-all",    protect, markAllRead);
router.put("/:id/read",    protect, markRead);

module.exports = router;