const express = require("express");
const ensure = require("connect-ensure-login");
const router = express.Router();
const db = require("../../../models");
const mongoose = require("../../../model/mongooseModels");
const Op = db.Sequelize.Op;

router.post("/", ensure.ensureLoggedIn(), async (req, res) => {
  try {
    if (req.body.project_id == null || req.body.project_id === "") {
      throw "400";
    }
    let project = await db.projects.findOne({
      where: {
        id: { [Op.eq]: req.body.project_id }
      }
    });
    if (!project) {
      throw "404";
    }
    if (!project.allowed.includes(req.user.id) && !project.public) {
      throw "401";
    }
    let joined = req.user.joined;
    if (!joined.includes(project.id)) {
      joined.push(project.id);
    }
    let mongoProjects = await mongoose.Projects.aggregate([
      {
        $match: {
          project_id: project.id
        }
      },
      {
        $unwind: "$sequences"
      },
      {
        $project: {
          sequences: {
            _id: 1
          }
        }
      }
    ]);
    if (mongoProjects.length === 0) {
      // no sequences!
      throw "403";
    }
    let seqId = mongoProjects[0].sequences._id.toString();
    await req.user.update({
      current_project: project.id,
      joined,
      last_seq: seqId,
      last_idx: 0
    });
    return res
      .status(200)
      .json({ success: true, current_project: project.id, joined });
  } catch (err) {
    if (err === "400") {
      return res
        .status(400)
        .json({ success: false, error: "incorrect parameters" });
    } else if (err === "403") {
      return res.status(403).json({ success: false, error: "No sequences" });
    } else if (err == "404") {
      return res
        .status(404)
        .json({ success: false, error: "Project not found" });
    } else if (err == "401") {
      return res
        .status(401)
        .json({ success: false, error: " Not allowed to join project" });
    } else {
      return res.status(500).json({ success: false, error: err });
    }
  }
});

module.exports = router;
