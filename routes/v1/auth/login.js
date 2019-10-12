const express = require("express");
const router = express.Router();
const passport = require("passport");
const { userContent } = require("../../utils");
router.get("/", function(req, res) {
  res.status(200);
});
router.post(
  "/",
  passport.authenticate("local", { failureRedirect: "/v1/auth/login" }),
  async function(req, res) {
    res.status(200).json(userContent(req.user));
  }
);

module.exports = router;
