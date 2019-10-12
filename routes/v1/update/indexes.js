const express = require("express");
const winston = require("winston");
const ensure = require("connect-ensure-login");
const router = express.Router();
const { validationResult } = require("express-validator");
const { indexSchema } = require("../../constants");

router.post("/", ensure.ensureLoggedIn(), indexSchema, async (req, res) => {
  if (validationResult(req).array().length > 0) {
    return res
      .status(400)
      .json({ success: false, error: validationResult(req).array() });
  }
  const { offset, toNumber } = req.body;
  let new_idx;
  if (toNumber != null && toNumber !== "") {
    new_idx = parseInt(toNumber);
  } else {
    if (req.user.last_idx + parseInt(offset) >= 0) {
      new_idx = req.user.last_idx + parseInt(offset);
    } else {
      new_idx = req.user.last_idx;
    }
  }
  try {
    await req.user.update({ last_idx: new_idx });
    return res.status(200).json({ success: true, newIndex: new_idx });
  } catch (err) {
    winston.log("error", "select index", err);
    return res
      .status(500)
      .json({ success: false, error: "Could not set user information" });
  }
});

module.exports = router;
