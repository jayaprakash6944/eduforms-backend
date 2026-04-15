const express = require("express");
const router  = express.Router();
const { getForms, getForm, createForm, updateForm, deleteForm } = require("../controllers/formController");
const { protect, authorize } = require("../middleware/auth");

router.get("/",       protect, getForms);
router.get("/:id",    protect, getForm);
router.post("/",      protect, authorize("college_admin"), createForm);
router.put("/:id",    protect, authorize("college_admin"), updateForm);
router.delete("/:id", protect, authorize("college_admin"), deleteForm);

module.exports = router;