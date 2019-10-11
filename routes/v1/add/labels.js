const express = require("express");
const router = express.Router();
const ensure = require("connect-ensure-login");
const { validationResult, checkSchema } = require("express-validator/check");
const { labelsSchema } = require("../../constants");
const mongoose = require("../../../models/mongoose");
router.post(
  "/",
  ensure.ensureLoggedIn(),
  checkSchema(labelsSchema),
  async (req, res) => {
    try {
      let results = validationResult(req);
      if (results.array().length > 0) {
        return res.status(400).json({error: results.array()})
      }
      let labelSet = await mongoose.LabelSets.findOne({
        project: req.user.current_project
      });
      if (labelSet == null) {
        labelSet = new mongoose.LabelSets({
          project: req.user.current_project
        });
      }
      labelSet.labels = req.body.labels;
      await labelSet.save();
      res.status(200).json({ success: true, labels: labelSet.labels });
    } catch (err) {
      res.status(500).json({ success: false, error: `System error: ${err}` });
    }
  }
);

module.exports = router;
