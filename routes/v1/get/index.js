const express = require("express");
const router = express.Router();
const image = require("./image")
const labels = require("./labels")
const projects = require("./projects")
const annotations = require("./annotations")
const sequences = require("./sequences")
const types = require("./types")

router.use("/image", image)
router.use("/labels", labels)
router.use("/projects", projects)
router.use("/annotations", annotations)
router.use("/sequences", sequences)
router.use("/types", types)

module.exports = router