const express = require("express");
const router  = express.Router();
const { getUsers, createUser, updateUser, deleteUser } = require("../controllers/userController");
const { protect, authorize } = require("../middleware/auth");

router.get("/",       protect, authorize("college_admin","college_director"), getUsers);
router.post("/",      protect, authorize("college_admin"), createUser);
router.put("/:id",    protect, authorize("college_admin"), updateUser);
router.delete("/:id", protect, authorize("college_admin"), deleteUser);

module.exports = router;