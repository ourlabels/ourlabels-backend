const express = require("express");
const router = express.Router();
const auth = require("./auth");
const change = require("./change");
const get = require("./get");
const join = require("./join");
const leave = require("./leave");
const request = require("./request");
const update = require("./update");
const verify = require("./verify");
const add = require("./add");

router.use("/add", add);
router.use("/auth", auth);
router.use("/change", change);
router.use("/get", get);
router.use("/join", join);
router.use("/leave", leave);
router.use("/request", request);
router.use("/update", update);
router.use("/verify", verify);

router.get("/", (req, res) => {
  res.render("index");
});

module.exports = router;
