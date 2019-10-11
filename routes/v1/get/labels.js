const ensure = require("connect-ensure-login");
const express = require("express");
const router = express.Router();
const { Projects } = require("../../../models/sequelize");
const mongoose = require("../../../models/mongoose");

router.get("/", ensure.ensureLoggedIn(), async (req, res) => {
  try {
    if (req.user.current_project == null) {
      return res
        .status(400)
        .json({ success: false, error: "No current project selected" });
    }
    let project = Projects.findOne({
      where: { id: req.user.current_project }
    });
    if (project == null) {
      return res
        .status(404)
        .json({ success: false, error: "No matching project" });
    }
    let labels = await mongoose.LabelSets.findOne({
      project: req.user.current_project
    });
    if (labels == null) {
      labels = new mongoose.LabelSets({
        project: req.user.current_project,
        labels: []
      });
      await labels.save();
    }
    return res.status(200).json({ success: true, labels });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: `System error: ${err}` });
  }
});

module.exports = router;
