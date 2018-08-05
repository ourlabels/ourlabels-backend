const express = require("express");
const router = express.Router();
const annotation = require("./annotation");

router.use("/annotation", annotation);

module.exports = router;
