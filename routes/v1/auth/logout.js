const ensure = require("connect-ensure-login");
const express = require("express");
const router = express.Router();

router.post("/", ensure.ensureLoggedIn(), async function(req, res) {
  try {
    req.logout();
    res.redirect("/");
  } catch (err) {
    return res.status(500);
  }
});

module.exports = router;
