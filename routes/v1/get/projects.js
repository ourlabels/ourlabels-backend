const express = require("express");
const router = express.Router();
const ensure = require("connect-ensure-login");
const db = require("../../../models/sequelize");
const mongoose = require("../../../models/mongoose");
const Op = require("sequelize").Op;
const getSize = images => {
  let size = 0;
  for (let image of images) {
    size += image.size;
  }
  return size;
};

router.get("/guest", async (req, res) => {
  try {
    let projects;
    let accumulator = [];
    projects = await db.Projects.findAll({
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
      projects = await db.Projects.findAll({
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
    let project = await db.Projects.findOne({
      where: {
        [Op.and]: [
          { id: { [Op.eq]: req.user.current_project } },
          { owner: { [Op.eq]: req.user.id } }
        ]
      }
    });
    if (process.env.DEBUG === "true") {
      console.log(`PROJECT SEQUELIZE ${JSON.stringify(project)} ${project.id}`);
    }
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "No current project or project is not owned by you."
      });
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
    if (process.env.DEBUG === "true") {
      console.log(`PROJECT INFO: ${JSON.stringify(projectInfo)}`);
    }
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
    console.log(concatenated, Array.isArray(concatenated));
    let users = [];
    if (concatenated.length > 1) {
      users = await db.Users.findAll({
        where: { id: { [Op.any]: concatenated } }
      });
    } else {
      users = await db.Users.findAll({ where: { id: concatenated[0] } });
    }
    if (process.env.DEBUG === "true") {
      console.log(`LIST OF USERS: ${JSON.stringify(users)}`);
    }
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
      maxSize:
        req.user.role === "ROLE_ADMIN"
          ? 25.0
          : req.user.role === "ROLE_MANAGER"
          ? 100.0
          : 200.0,
      sequencenames
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err });
  }
});
module.exports = router;
