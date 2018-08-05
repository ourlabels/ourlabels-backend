const ensure = require("connect-ensure-login");
const express = require("express");
const router = express.Router();
const { userContent } = require("../../utils");

router.get("/", ensure.ensureLoggedIn(), (req, res) => {
  return res.status(200).json(userContent(req.user));
});

module.exports = router;
