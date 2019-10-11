const express = require("express");
const router = express.Router();
const ensure = require("connect-ensure-login");
const {Projects} = require("../../../models/sequelize")
const Op = require("sequelize").Op;

router.post("/", ensure.ensureLoggedIn(), async (req, res) => {
  try {
    if (req.body.project_name == null || req.body.project_name === "") {
      throw "400";
    }
    let project = await Projects.findOne({
      where: { title: { [Op.eq]: req.body.project_name } }
    });
    if (!project) {
      throw "404";
    }
    let requested = project.requested;
    if (
      requested.includes(req.user.id) ||
      (!project.public && project.refused.includes(req.user.id))
    ) {
      throw "401";
    }
    requested.push(req.user.id);
    await project.update({ requested });
    return res.status(200).json({ success: true });
  } catch (err) {
    if (err === "400") {
      return res
        .status(400)
        .json({ success: false, error: "Incorrect arguments" });
    } else if (err === "401") {
      return res
        .status(401)
        .json({ success: false, error: "Already requested project" });
    } else if (err === "404") {
      return res.status(404).json({
        success: false,
        error: "Project not found, or user is refused"
      });
    }
    return res.status(500).json({ success: false, error: err });
  }
});

module.exports = router;
