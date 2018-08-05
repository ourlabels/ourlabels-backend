const express = require("express");
const router = express.Router();
const db = require("../../../models");
const mongoose = require("../../../model/mongooseModels");
const ensure = require("connect-ensure-login");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

router.post("/", ensure.ensureLoggedIn(), async (req, res) => {
  try {
    if (req.body.project_id == null || req.body.project_id === "") {
      throw "400";
    }
    let project = await db.projects.findOne({
      where: { id: { [Op.eq]: req.body.project_id } }
    });
    if (!project) {
      throw "404";
    }
    if (!project.public && !project.allowed.includes(req.user.id)) {
      throw "401";
    }
    if (project.owner === req.user.id || req.user.joined.includes(project.id)) {
      throw "201";
    }
    let joined = req.user.joined;
    joined.push(project.id);
    let mongoProjects = await mongoose.Projects.aggregate([
      {
        $match: {
          project_id: project.id
        }
      },
      { $unwind: "$sequences" },
      {
        $project: {
          sequences: { _id: 1 }
        }
      }
    ]);
    await req.user.update({
      last_idx: 0,
      last_seq: mongoProjects[0].sequences._id.toString(),
      joined,
      current_project: project.id
    });
    return res.status(200).json({
      success: true,
      joined: joined,
      current_project: project.id
    });
  } catch (err) {
    // lots of possible errors
    if (err === "400") {
      return res
        .status(400)
        .json({ success: false, error: "Incorrect arguments supplied" });
    } else if (err === "404") {
      return res
        .status(404)
        .json({ success: false, error: "No such project found" });
    } else if (err === "401") {
      return res.status(401).json({
        success: false,
        error: "Unauthorized, please request to join from the project owner"
      });
    } else if (err === "201") {
      return res
        .status(200)
        .json({ success: false, error: "Already joined group" });
    }
    return res.status(500).json({ success: false, error: err });
  }
});

module.exports = router