const express = require("express");
const router = express.Router();
const passport = require("passport");
const { userContent } = require("../../utils");

router.post("/", passport.authenticate("local"), async function(req, res) {
  res.status(200).json(userContent(req.user));
});

module.exports = router;
