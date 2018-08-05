const express = require("express");
const router = express.Router();
const ensure = require("connect-ensure-login");
const db = require("../../../models");
const mongoose = require("../../../model/mongooseModels");
const Op = db.Sequelize.Op;

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
        full_description: project.full_description,
        type: project.type,
        public: project.public,
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
          full_description: project.full_description,
          type: project.type,
          public: project.public,
          featured: project.featured,
          owner: project.owner === req.user.id,
          allowed: project.allowed.includes(req.user.id),
          requested: project.requested.includes(req.user.id),
          refused: project.refused.includes(req.user.id),
          joined: req.user.joined.includes(project.id),
          current_project: req.user.current_project === project.id
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
    if (req.query.project_id == null || req.query.project_id === "") {
      throw "Project not specified";
    }
    let project = await db.projects.findOne({
      where: {
        [Op.and]: [
          { id: { [Op.eq]: req.query.project_id } },
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
          "sequences.images.file": 1
        }
      }
    ]);
    let sequencenames = [];
    if (projectInfo.length > 0) {
      sequencenames = projectInfo[0].sequences.map(sequence => {
        return {
          name: sequence.sequence,
          video: sequence.video,
          files: sequence.images.length
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
        refused.push({
          username: user.username
        });
      } else if (project.requested.includes(user.id)) {
        requested.push({
          username: user.username
        });
      } else {
        allowed.push({
          username: user.username,
          joined: user.joined.includes(project.id)
        });
      }
    }
    return res.status(200).json({
      success: true,
      allowed,
      refused,
      requested,
      public: project.public,
      type: project.type,
      sequencenames
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err });
  }
});
module.exports = router;
