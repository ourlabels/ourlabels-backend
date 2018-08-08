const express = require("express");
const router = express.Router();
const labels = require("./labels");
const project = require("./project");
const annotations = require("./annotations");
const type = require("./type");
router.use("/annotation", annotations);
router.use("/labels", labels);
router.use("/project", project);
router.use("/type", type);
module.exports = router