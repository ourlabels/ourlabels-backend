const passport = require("passport");
const express = require("express");
const router = express.Router();
const { userContent } = require("../../utils");

router.get("/", passport.authorize('local'), (req, res) => {
  console.log("HERE")
  return res.json({})
  return res.status(200).json(userContent(req.user));
});

module.exports = router;
