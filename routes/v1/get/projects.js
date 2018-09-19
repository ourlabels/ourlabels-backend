const express = require("express");
const router = express.Router();
const ensure = require("connect-ensure-login");
const db = require("../../../models");
const winston = require("winston")
const mongoose = require("../../../model/mongooseModels");
const Op = db.Sequelize.Op;
const getSize = (images) => {
  let size = 0
  for (let image of images) {
    size += image.size
  }
  return size;
}

router.get("/guest", async (req, res) => {
  try {
    let projects;
    let accumulator = [];
    projects = await db.projects.findAll({
      where: { public: true }
    });
    projects.forEach(project => {
      const project_obj = {
        id: project.id,
        title: project.title,
        description: project.description,
        fullDescription: project.full_description,
        projectType: project.type,
        publicType: project.public,
        featured: project.featured
      };
      accumulator.push(project_obj);
    });
    res.status(200).json({ success: true, projects: accumulator });
  } catch (err) {
    res.status(200).json({ success: false, error: err });
  }
});

router.get("/", ensure.ensureLoggedIn(), async (req, res) => {
  try {
    let projects;
    let accumulator = [];
    if (req.user) {
      projects = await db.projects.findAll({
        where: {
          [Op.or]: [
            { public: true },
            { featured: true },
            { owner: req.user.id },
            { allowed: { [Op.contains]: [req.user.id] } },
            { requested: { [Op.contains]: [req.user.id] } },
            { refused: { [Op.contains]: [req.user.id] } }
          ]
        }
      });
      projects.forEach(project => {
        const project_obj = {
          id: project.id,
          title: project.title,
          description: project.description,
          fullDescription: project.full_description,
          projectType: project.type,
          publicType: project.public,
          featured: project.featured,
          owner: project.owner === req.user.id,
          allowed: project.allowed.includes(req.user.id),
          requested: project.requested.includes(req.user.id),
          refused: project.refused.includes(req.user.id),
          joined: req.user.joined.includes(project.id),
          currentProject: req.user.current_project === project.id
        };
        accumulator.push(project_obj);
      });
      res.status(200).json({ success: true, projects: accumulator });
    }
  } catch (err) {
    res.status(200).json({ success: false, error: err });
  }
});
router.get("/update", ensure.ensureLoggedIn(), async (req, res) => {
  try {
    let project = await db.projects.findOne({
      where: {
        [Op.and]: [
          { id: { [Op.eq]: req.user.current_project } },
          { owner: { [Op.eq]: req.user.id } }
        ]
      }
    });
    if (!project) {
      throw "No project with project id or of which you are the owner specified";
    }
    let projectInfo = await mongoose.Projects.aggregate([
      {
        $match: { project_id: project.id }
      },
      {
        $project: {
          "sequences.sequence": 1,
          "sequences.video": 1,
          "sequences.images.file": 1,
          "sequences.images.size": 1,
          "sequences.segmentsX": 1,
          "sequences.segmentsY": 1
        }
      }
    ]);
    let sequencenames = [];
    if (projectInfo.length > 0) {
      sequencenames = projectInfo[0].sequences.map(sequence => {
        return {
          name: sequence.sequence,
          video: sequence.video,
          files: sequence.images.length,
          size: getSize(sequence.images), // in bytes
          vSplit: sequence.segmentsY,
          hSplit: sequence.segmentsX
        };
      });
    }
    let concatenated = project.requested
      .concat(project.refused)
      .concat(project.allowed);
    let users = await db.ourlabelusers.findAll({
      where: { id: { [Op.any]: concatenated } }
    });
    let requested = [];
    let allowed = [];
    let refused = [];
    for (let user of users) {
      if (project.refused.includes(user.id)) {
        refused.push(user.username);
      } else if (project.requested.includes(user.id)) {
        requested.push(user.username);
      } else {
        allowed.push(user.username);
      }
    }
    return res.status(200).json({
      success: true,
      description: project.description,
      fullDescription: project.full_description,
      allowed,
      refused,
      requested,
      publicType: project.public,
      type: project.type,
      maxSize: req.user.role === "ROLE_ADMIN" ? 25.0 : req.user.role === "ROLE_MANAGER" ? 45.0 : 100.0,
      sequencenames
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err });
  }
});
module.exports = router;
