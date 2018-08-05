const express = require("express");
const router = express.Router();
const index = require("./indexes");
const project = require("./project");
const role = require("./role");
const sequence = require("./sequence");

router.use("/index", index);
router.use("/project", project);
router.use("/role", role);
router.use("/sequence", sequence);

module.exports = router;
