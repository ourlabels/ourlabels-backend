var express = require("express");
var router = express.Router();

const passport = require("passport");
require("dotenv").config({ path: "../config/ourlabels.env" });
const db = require("../models");
const mongoose = require("../model/mongooseModels");
const bcrypt = require("bcrypt");
const uuidv1 = require("uuid/v1");
const sharp = require("sharp");
const fs = require("fs");
const saltRounds = 12;
const winston = require("winston");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

const regexpEmail = /^[_A-Za-z0-9-+]+(.[_A-Za-z0-9-]+)*@[A-Za-z0-9-]+(.[A-Za-z0-9]+)*(.[A-Za-z]{2,})$/;
const ensure = require("connect-ensure-login");
const maxSize = 15 * Math.pow(2, 20); // 16 MB limit, but keep to 15 to be safe
const multer = require("multer");
const rimraf = require("rimraf");
var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function(req, file, cb) {
    if (/.png|.jpg|.jpeg/.test(file.originalname.toLowerCase())) {
      cb(null, `${req.user.id}-${Date.now()}.jpg`.toLowerCase());
    } else if (/.mp4|.mpeg|.mpg|.ts/.test(file.originalname.toLowerCase())) {
      cb(null, file.originalname.toLowerCase());
    } else {
      cb(null, "x");
    }
  }
});

const upload = multer({
  limits: {
    fileSize: maxSize
  },
  storage: storage
});

function userContent(user) {
  if (user.username) {
    return {
      success: true,
      username: user.username,
      id: user.id,
      score: user.score,
      email: user.email,
      current_project: user.current_project,
      role: user.role
    };
  }
  return {};
}

/* GET home page. */
router.post("/login", passport.authenticate("local"), async function(
  req,
  res,
  next
) {
  res.status(200).json(userContent(req.user));
});

router.post("/logout", ensure.ensureLoggedIn(), async function(req, res, next) {
  req.logout();
});
router.post("/updateUserRole", async (req, res, next) => {
  if (
    req.body.username === undefined ||
    req.body.username === "" ||
    req.body.role_to_change_to === undefined ||
    req.body.role_to_change_to === "" ||
    !["ROLE_ADMIN", "ROLE_OWNER"].includes(req.user.role)
  ) {
    return res.status(400).json({
      success: false,
      error: "Incorrect attributes or role is not adequate"
    });
  }
  try {
    let roles = ["ROLE_USER", "ROLE_CREATOR", "ROLE_ADMIN", "ROLE_OWNER"];
    let user_to_change = db.ourlabelusers.findOne({
      where: { username: { [Op.eq]: req.body.username } }
    });
    if (
      roles.indexOf(user_to_change.role) >= roles.indexOf(req.user.role) ||
      roles.indexOf(req.body.role_to_change_to) >= roles.indexOf(req.user.role)
    ) {
      // can only make somebody one less than your role. Owner's can only make Admins,
      // Admins can only make Creators
      throw "400";
    }
    if (!user_to_change) {
      throw "404";
    }
    let role = user_to_change.role;
    role = req.body.role_to_change_to;
    await user_to_change.update({ role });
    return res.status(200).json({ success: true });
  } catch (err) {
    if (err === "400") {
      return res.status(400).json({
        success: false,
        error: "Can only change user to below your current role."
      });
    } else if (err === "404") {
      return res.status(400).json({ success: false, error: "User not found" });
    }
    return res
      .status(500)
      .json({ success: false, error: `System error: ${err}` });
  }
});
router.post("/signup", async function(req, res, next) {
  if (
    req.body.username != undefined &&
    req.body.password != undefined &&
    req.body.email != undefined &&
    (req.body.username !== "" &&
      req.body.password !== "" &&
      req.body.email !== "")
  ) {
    let user = null;
    try {
      user = await db.ourlabelusers.findOne({
        where: {
          username: req.body.username
        }
      });
      if (user !== null) {
        throw "usernameexists";
      }
      user = await db.ourlabelusers.findOne({
        where: {
          email: {
            [Op.eq]: req.body.email
          }
        }
      });
      if (user !== null) {
        throw "emailexists";
      }
      // user does not exist
      if (!passwordMeetsCriteria(req.body.password)) {
        throw "passworddoesnotmeetcriteria";
      }
      if (!emailMeetsCriteria(req.body.email)) {
        throw "emaildoesnotmeetcriteria";
      }
      const newUser = db.ourlabelusers.build({
        username: req.body.username,
        password: bcrypt.hashSync(req.body.password, saltRounds),
        email: req.body.email,
        id: uuidv1(),
        owned_projects: [],
        joined: [],
        current_project: null,
        role: "ROLE_USER"
      });
      await newUser.save();
      res.status(200).json(userContent(newUser));
    } catch (err) {
      winston.log("error", err);
      let value;
      switch (err) {
      case "usernameexists":
        value = -1;
        break;
      case "emailexists":
        value = -2;
        break;
      case "passworddoesnotmeetcriteria":
        value = -3;
        break;
      case "emaildoesnotmeetcriteria":
        value = -4;
        break;
      case "emailnotwhitelisted":
        value = -99;
        break;
      default:
        value = -5;
        break;
      }
      res.status(200).send({ success: value });
    }
  } else {
    // no info
    res.status(200).send({ success: 0 });
  }
});

router.get("/", (req, res, next) => {
  res.render("index");
});
router.get("/home", (req, res, next) => {
  res.redirect("/");
});
router.get("/signup", (req, res, next) => {
  res.redirect("/");
});
router.get("/login", (req, res, next) => {
  res.redirect("/");
});
router.get("/news", (req, res, next) => {
  res.redirect("/");
});
router.get("/labeling", (req, res, next) => {
  res.redirect("/");
});

router.get("/updateIndex", ensure.ensureLoggedIn(), async (req, res, next) => {
  if (req.query.offset == null) {
    return res
      .status(400)
      .json({ success: false, error: "Incorrect information" });
  }
  const { offset, toNumber } = req.query;
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

router.get("/user", ensure.ensureLoggedIn(), (req, res, next) => {
  return res.status(200).json(userContent(req.user));
});
router.post("/addLabels", ensure.ensureLoggedIn(), async (req, res, next) => {
  if (
    req.body.labels !== "" &&
    req.body.labels &&
    typeof req.body.labels === "object"
  ) {
    try {
      for (let label of req.body.labels) {
        if (
          typeof label !== "object" ||
          !label.type ||
          !label.color ||
          !label.description
        ) {
          throw "incorrect array of types {type, color, description}";
        }
      }
      let newLabelSet = new mongoose.LabelSets({
        project: req.user.current_project,
        labels: req.body.labels
      });
      await newLabelSet.save();
      res.status(200).json({ success: true, labels: newLabelSet.labels });
    } catch (err) {
      res.status(500).json({ success: false, error: `System error: ${err}` });
    }
  } else {
    res.status(400).json({
      success: false,
      error: "Must send labels property as JSON array"
    });
  }
});
router.post("/joinProject", ensure.ensureLoggedIn(), async (req, res, next) => {
  try {
    if (req.body.project_id === undefined || req.body.project_id === "") {
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
router.post(
  "/leaveProject",
  ensure.ensureLoggedIn(),
  async (req, res, next) => {
    try {
      if (req.body.project_id === undefined || req.body.project_id === "") {
        throw "400";
      }
      if (!req.user.joined.includes(req.body.project_id)) {
        throw "401";
      }
      let joined = req.user.joined;
      let idx = joined.indexOf(req.body.project_id);

      joined.splice(idx, 1);
      let current_project = req.user.current_project;
      if (joined.length > 0) {
        current_project = joined[0];
      } else if (joined.length === 0) {
        current_project = null;
      }
      await req.user.update({
        joined,
        current_project
      });
      return res.status(200).json({ success: true, joined, current_project });
    } catch (err) {
      if (err === "400") {
        return res
          .status(400)
          .json({ success: false, error: "Incorrect attributes" });
      } else if (err === "401") {
        return res
          .status(401)
          .json({ success: false, error: "Project not joined" });
      }
      return res.status(500).json({ success: false, error: err });
    }
  }
);
router.post("/addType", ensure.ensureLoggedIn(), async (req, res, next) => {
  try {
    if (req.user.role !== "ROLE_ADMIN") {
      throw "401";
    }
    if (
      req.body.title === undefined ||
      req.body.title === "" ||
      req.body.video === undefined ||
      req.body.video === ""
    ) {
      throw "400";
    }
    let type = db.project_types.findOne({
      where: { title: { [Op.eq]: req.body.title } }
    });
    if (type) {
      throw "300";
    }
    let new_type = db.project_types.build({
      title: req.body.title,
      video: req.body.video
    });
    await new_type.save();
    return res.status(200).json({ success: true, type: new_type });
  } catch (err) {
    if (err === "300") {
      return res
        .status(400)
        .json({ success: false, error: `Type already exists` });
    } else if (err === "400") {
      return res.status(400).json({
        success: false,
        error: `Incorrect attributes, required: title (string), video (boolean)`
      });
    } else if (err === "401") {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    return res
      .status(500)
      .json({ success: false, error: `Server error: ${err}` });
  }
});
router.get("/getTypes", async (req, res, next) => {
  try {
    let types = await db.project_types.findAll({});
    let accumulator = [];
    for (let type of types) {
      const type_obj = {
        id: type.id,
        type: type.type,
        video: type.sequences_are_video
      };
      accumulator.push(type_obj);
    }
    return res.status(200).json({ success: true, types: accumulator });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: `Server error: ${err}` });
  }
});
router.get("/getLabels", ensure.ensureLoggedIn(), async (req, res, next) => {
  try {
    let labels = await mongoose.LabelSets.findOne({
      project: req.user.current_project
    });
    if (labels) {
      res.status(200).json({ success: true, labels });
    } else {
      res.status(200).json({ success: false, error: "No matching labels" });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: `System error: ${err}` });
  }
});
router.get(
  "/getProjectForUpdate",
  ensure.ensureLoggedIn(),
  async (req, res, next) => {
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
  }
);
router.post(
  "/requestAccessToProject",
  ensure.ensureLoggedIn(),
  async (req, res, next) => {
    try {
      if (req.body.project_name == null || req.body.project_name === "") {
        throw "400";
      }
      let project = await db.projects.findOne({
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
  }
);

router.get("/getProjects", ensure.ensureLoggedIn(), async (req, res, next) => {
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
        project_obj = {
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
router.post(
  "/changeProject",
  ensure.ensureLoggedIn(),
  async (req, res, next) => {
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
      let seqId = mongoProjects[0].sequences._id;
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
  }
);
router.get("/getProjectsNotLoggedIn", async (req, res, next) => {
  try {
    let projects;
    let accumulator = [];
    projects = await db.projects.findAll({
      where: { public: true }
    });
    projects.forEach(project => {
      let project_obj = {
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

router.post("/addProject", ensure.ensureLoggedIn(), async (req, res, next) => {
  try {
    let project = await db.projects.findOne({
      where: { title: { [Op.eq]: req.body.title } }
    });
    if (project) {
      // can't label something the same as another project
      res
        .status(200)
        .json({ success: false, error: "Project name is already taken" });
    } else {
      if (
        !req.body.title === undefined ||
        req.body.title === "" ||
        !req.body.description === undefined ||
        req.body.description === "" ||
        req.body.full_description === undefined ||
        req.body.full_description === "" ||
        req.body.public === undefined ||
        req.body.type === undefined
      ) {
        throw "400";
      }
      let type = await db.project_types.findOne({
        where: { id: { [Op.eq]: req.body.type } }
      });
      if (!type) {
        throw "404";
      }
      let new_project = await db.projects.build({
        title: req.body.title,
        description: req.body.description,
        full_description: req.body.full_description,
        allowed: [req.user.id],
        public: req.body.public,
        type: type.id,
        requested: [],
        refused: [],
        owner: req.user.id
      });
      await new_project.save();
      let projects = req.user.owned_projects;
      projects.push(new_project.id);
      let update = await req.user.update({
        owned_projects: projects,
        current_project: new_project.id
      });
      let proj = {
        title: new_project.title,
        description: new_project.description,
        full_description: new_project.full_description,
        allowed: new_project.allowed,
        owner: new_project.owner
      };
      fs.mkdirSync(`updaloads/${new_project.id}`);
      res.status(200).json({ success: true, project: proj });
    }
  } catch (err) {
    if (err === "400") {
      return res.status(400).json({
        success: false,
        error: `Correct attributes not included. Cannot create project`
      });
    } else if (err === "404") {
      return res.status(400).json({ success: false, error: `Incorrect type.` });
    }
    res.status(500).json({ success: false, error: `Server error: ${err}` });
  }
});
router.post(
  "/updateProject",
  ensure.ensureLoggedIn(),
  upload.array("files"),
  async (req, res, next) => {
    /* 
    //
    REQUIRED JSON object attributes
    project: INTEGER corresponding to existing project id,
    add_allowed: ARRAY of usernames(STRING), if none to add, send [],
    add_refused: ARRAY of usernames(STRING), if none to add, send []
    
    //
    OPTIONAL
    public: BOOLEAN,
    owner: STRING username, for new owner that is not you, your user must own project,
    description:
    full_description:
    type: INTEGER referring to existing project_type
    */
    try {
      if (
        req.body.project_id == null ||
        req.body.project_id === "" ||
        req.body.public == null ||
        req.body.owner == null ||
        req.body.owner === "" ||
        req.body.description == null ||
        req.body.description === "" ||
        req.body.full_description == null ||
        req.body.full_description === "" ||
        req.body.type == null
      ) {
        throw "400";
      }
      let project = await db.projects.findOne({
        where: {
          [Op.and]: [
            { id: { [Op.eq]: parseInt(req.body.project_id) } },
            { owner: { [Op.eq]: req.user.id } }
          ]
        }
      });
      if (!project) {
        throw "404";
      }
      let reqallowed = [];
      if (req.body.allowed != null) {
        reqallowed = req.body.allowed;
      }
      let allowedUsers = await db.ourlabelusers.findAll({
        where: { username: { [Op.in]: reqallowed } }
      });
      let reqrefused = [];
      if (req.body.refused != null) {
        reqrefused = req.body.refused;
      }
      let refusedUsers = await db.ourlabelusers.findAll({
        where: { username: { [Op.in]: reqrefused } }
      });
      for (let refusedUser of refusedUsers) {
        let joined = refusedUser.joined;
        let idx = joined.indexOf(project.id);
        if (idx >= 0) {
          joined.splice(idx);
        }
        let currentProject = refusedUser.current_project;
        if (currentProject === project.id) {
          let currentProject = null;
        }
        // don't wait for these async actions
        refusedUser.update({
          current_project: currentProject,
          joined
        });
      }
      let reqrequested = [];
      if (req.body.requested != null) {
        reqrequested = req.body.requested;
      }
      let requestedUsers = await db.ourlabelusers.findAll({
        where: { username: { [Op.in]: reqrequested } }
      });
      let allowed = allowedUsers.map(user => {
        return user.id;
      });
      let refused = refusedUsers.map(user => {
        return user.id;
      });
      let requested = requestedUsers.map(user => {
        return user.id;
      });
      let public = req.body.public;

      let new_owner = await db.ourlabelusers.findOne({
        where: { username: { [Op.eq]: req.body.owner } }
      });
      if (new_owner) {
        owner = new_owner.id;
      }
      const { description, full_description } = req.body;

      let new_type = await db.project_types.findOne({
        where: { id: { [Op.eq]: parseInt(req.body.type) } }
      });
      let type = project.type;
      if (new_type) {
        type = new_type.id;
      }
      let mongoProject = await mongoose.Projects.findOne({
        project_id: project.id
      });
      if (!mongoProject) {
        mongoProject = new mongoose.Projects({
          project_id: project.id,
          sequences: []
        });
      }
      let newSeqs = JSON.parse(req.body.new);
      let updateSeqs = JSON.parse(req.body.update);
      let deleteSeqs = JSON.parse(req.body.delete);
      let sequences = mongoProject.sequences;
      const [toSave, toDelete] = sequences.reduce(
        ([save, del], seq) => {
          return !deleteSeqs.includes(seq.sequence)
            ? [[...save, seq], del]
            : [save, [...del, seq]];
        },
        [[], []]
      );
      sequences = toSave;
      for (let seqToDelete of toDelete) {
        rimraf.sync(`uploads/${project.id}/${seqToDelete.sequence}/`);
      }
      for (let updSeq of Object.keys(updateSeqs)) {
        let seq = updateSeqs[updSeq];
        if (fs.existsSync(`uploads/${project.id}/${updSeq}`)) {
          if (updSeq !== seq.name) {
            fs.renameSync(
              `uploads/${project.id}/${updSeq}`,
              `uploads/${project.id}/${seq.name}`
            );
          }
        } else {
          fs.mkdirSync(`uploads/${project.id}/${seq.name}`);
        }
        let images = [];
        for (let i = seq.begin; i <= seq.end; i += 1) {
          fs.renameSync(
            req.files[i].path,
            `uploads/${project.id}/${seq.name}/${req.files[i].filename}`
          );
          images.push({
            userid: req.user.id,
            file: req.files[i].filename,
            date: new Date(),
            size: req.files[i].size,
            classifications: []
          });
        }
        let i = 0;
        for (; i < sequences.length; i += 1) {
          if (sequences[i].sequence === updSeq) {
            break;
          }
        }
        if (i < sequences.length) {
          let sequence = sequences[i];
          sequences.splice(i, 1);
          sequence.sequence = seq.name;
          sequence.images = sequence.images.concat(images);
          sequences.push(sequence);
        }
      }
      for (let newSeq of Object.keys(newSeqs)) {
        let seq = newSeqs[newSeq];
        fs.mkdirSync(`uploads/${project.id}/${seq.name}`);
        let images = [];
        for (let i = seq.begin; i <= seq.end; i += 1) {
          fs.renameSync(
            req.files[i].path,
            `uploads/${project.id}/${seq.name}/${req.files[i].filename}`
          );
          images.push({
            userid: req.user.id,
            file: req.files[i].filename,
            date: new Date(),
            size: req.files[i].size,
            classifications: []
          });
        }
        sequences.push({
          sequence: seq.name,
          video: seq.video,
          images,
          segmentsX: seq.segmentsX,
          segmentsY: seq.segmentsY
        });
      }
      mongoProject.sequences = sequences;
      await mongoProject.save();
      await project.save();
      res.status(200).json({ success: true });
    } catch (err) {
      winston.log("error", err);
      res.status(500).json({ success: false });
    }
  }
);

router.get("/getRects", ensure.ensureLoggedIn(), async (req, res, next) => {
  let seq = req.user.last_seq; // ObjectId
  let offset = parseInt(req.query.offset);
  let idx = req.user.last_idx + offset; // Index
  let project_id = req.user.current_project;
  try {
    if (project_id == null || seq == null) {
      throw "404";
    }
    let avail = await mongoose.Projects.aggregate([
      { $match: { project_id } },
      { $unwind: "$sequences" },
      { $match: { "sequences._id": mongoose.ObjectId(seq) } },
      {
        $project: {
          images: { $slice: ["$sequences.images", idx, 1] }
        }
      },
      { $unwind: "$images" }
    ]);
    const classifications = avail[0].images.classifications;
    let boxes = [];
    if (avail[0].images.classifications.length !== 0) {
      boxes = classifications[classifications.length - 1].boxes;
    }
    return res.status(200).json({ success: true, boxes, idx });
  } catch (err) {
    return res.status(500).json({ success: false, error: err });
  }
});
router.post("/verifyRects", ensure.ensureLoggedIn(), async (req, res, next) => {
  let original_verified = null;
  let verified_changed = null;
  let original_verifier = null;
  let verifier_changed = null;
  try {
    let seq = req.user.last_seq;
    let idx = req.user.last_idx;
    let project_id = req.user.current_project;
    let project = await mongoose.Projects.findOne({ project_id });
    let seq_index = -1;
    project.sequences.forEach((seq_val, idx) => {
      if (seq_val._id.toString() === seq) {
        seq_index = idx;
      }
    });
    if (seq_index === -1) {
      throw "404";
    }
    const idx_last_classification =
      project.sequences[seq_index].images[idx].classifications.length - 1;
    let classification =
      project.sequences[seq_index].images[idx].classifications[
        idx_last_classification
      ];
    if (classification.userid === req.user.id) {
      // cannot verify your own annotations
      throw "401";
    }
    let verified_user = await db.ourlabelusers.findOne({
      where: { id: { [Op.eq]: classification.userid } }
    });
    if (!verified_user) {
      // user does not exist, or no longer exists so nobody to give points to
      throw "404";
    }
    original_verified = verified_user.score;
    verified_user.score = verified_user.score + 10;
    await verified_user.save();
    verified_changed = verified_user;
    original_verifier = req.user.score;
    req.user.score = req.user.score + 1;
    await req.user.save();
    verifier_changed = req.user;
    project.sequences[seq_index].images[idx].classifications[
      idx_last_classification
    ].verified_id =
      req.user.id;
    project.sequences[seq_index].images[idx].classifications[
      idx_last_classification
    ].verified_date =
      req.user.id;
    await project.save();
    return res.status(200).json({ success: true });
  } catch (err) {
    if (err === "401") {
      return res
        .status(401)
        .json({ success: true, error: "Cannot verify your own annotations" });
    } else if (err === "404") {
      return res
        .status(404)
        .json({ success: true, error: "User no longer exists" });
    }
    if (verified_changed) {
      verified_changed.score = original_verified;
      if (original_verifier != null) {
        verifier_changed.score = original_verifier;
      }
      try {
        await verified_changed.save();
        await verifier_changed.save();
      } catch (err_verified) {
        return res
          .status(500)
          .json({ success: false, error: "Could not revert user" });
      }
    }
    return res
      .status(500)
      .json({ success: false, error: `Server error: ${err}` });
  }
});
router.post("/addRects", ensure.ensureLoggedIn(), async (req, res, next) => {
  try {
    let seq = req.user.last_seq;
    let idx = req.user.last_idx;
    let project_id = req.user.current_project;
    let project = await mongoose.Projects.findOne({ project_id });
    let user_score = req.user.score;
    let seq_index = -1;
    project.sequences.forEach((seq_val, idx) => {
      if (seq_val._id.toString() === seq) {
        seq_index = idx;
      }
    });
    if (seq_index === -1) {
      throw "404";
    }
    let segmentsX = project.sequences[seq_index].segmentsX;
    let segmentsY = project.sequences[seq_index].segmentsX;
    // only one images subdocument should have been returned by slice
    let boxes = generateBoxesFromBoxes(req.body.boxes);
    let classifications_organized = organizeClassifications(
      boxes,
      segmentsX,
      segmentsY
    );
    project.sequences[seq_index].images[idx].classifications.push({
      userid: req.user.id,
      type: 0,
      boxes: classifications_organized,
      date: new Date()
    });
    await project.save(); // save the subdocuments too
    await req.user.update({
      score: user_score + 1
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

const generateBoxesFromBoxes = function(boxes) {
  let newBoxes = [];
  for (box of boxes) {
    newBoxes.push({
      width: box.w,
      height: box.h,
      x: box.x,
      y: box.y,
      justCreated: false,
      type_key: box.type,
      id: box.id
    });
  }
  return newBoxes;
};
router.post(
  "/addVideos",
  ensure.ensureLoggedIn(),
  upload.array("videos", 24),
  async (req, res, next) => {
    try {
      if (
        req.body.project_id == null ||
        req.body.sequences == null ||
        typeof req.body.sequences !== "object" ||
        req.body.sequences.length !== req.files.length
      ) {
        throw "400";
      }
      const { project_id, sequences } = req.body;
      let project = await db.projects.findOne({
        where: { id: { [Op.eq]: project_id } }
      });
      if (!project) {
        throw "404";
      }
      if (project.owner !== req.user.id) {
        throw "401";
      }
      for (let file of req.files) {
        if (!/.mp4|.mpeg|.mpg|.ts/.test(file.filename)) {
          throw "402"; // wrong file type
        }
      }
      const { spawn } = require("child_process");
      let i = 0;
      for (let file of req.files) {
        let seqname = sequences[i];
        let destination = `${file.destination}${project_id}/${seqname}/`;
        fs.mkdirSync(destination);
        const ffmpeg = spawn("ffmpeg", [
          "-i",
          file.path,
          "-r 1",
          `${prefix}%04d.jpg`
        ]);
        ffmpeg.on("close", code => {
          winston.log("info", `Child process exited with ${code}`);
        });
      }
      // project exists, files are correct format
      // NOW move files to processing folder, rename files to sequence names and
    } catch (err) {
      // do something with error
      winston.log("error", `${err}`);
      // always delete all updloaded files if error on one
      for (let file of req.files) {
        if (fs.existsSync(`${file.path}`)) {
          fs.unlinkSync(`${file.path}`);
        }
      }
    }
  }
);

router.post(
  "/addImage",
  ensure.ensureLoggedIn(),
  upload.single("image"),
  async (req, res, next) => {
    let seq = req.body.seq;
    let id = req.body.id;
    let seg_x = req.body.seg_x ? req.body.seg_x : 1;
    let seg_y = req.body.seg_y ? req.body.seg_y : 1;
    let foundSequence = await mongoose.ImageSequences.findOne({
      sequence: seq
    });
    if (foundSequence === null) {
      foundSequence = new mongoose.ImageSequences({
        sequence: seq,
        images: [],
        segmentsX: 1,
        segmentsY: 1
      });
    }
    foundSequence.images.push({
      userid: req.user.id,
      file: req.file.filename,
      imageid: id,
      date: new Date(),
      size: req.file.size,
      classifications: []
    });

    try {
      await foundSequence.save();
      return res.status(200).json({ success: true });
    } catch (err) {
      winston.log(
        "error",
        "error saving file to mongo from user id: ",
        req.user.id
      );
    }
    return res.status(500).json({ success: false });
  }
);

router.post(
  "/updateSequence",
  ensure.ensureLoggedIn(),
  async (req, res, next) => {
    try {
      if (req.body.sequence == null) {
        throw "400";
      }
      let seqs = await mongoose.Projects.aggregate([
        { $match: { project_id: req.user.current_project } },
        {
          $unwind: "$sequences"
        },
        {
          $project: {
            _id: 0,
            sequences: { sequence: 1, _id: 1 }
          }
        },
        {
          $match: {
            "sequences.sequence": req.body.sequence
          }
        }
      ]);
      if (seqs.length === 0) {
        throw "404";
      }
      await req.user.update({
        last_seq: seqs[0].sequences._id.toString(),
        last_idx: 0
      });
      return res.status(200).json({ success: true });
    } catch (err) {
      if (err === "400") {
        return res
          .status(400)
          .json({ success: false, error: "Incorrect attributes" });
      } else if (err === "404") {
        return res
          .status(404)
          .json({ success: false, error: "No such sequence" });
      }
      winston.log("error", "err:", err);
      return res.status(500).json({ success: false });
    }
  }
);
router.get("/getSequences", ensure.ensureLoggedIn(), async (req, res, next) => {
  try {
    let seqs = await mongoose.Projects.aggregate([
      { $match: { project_id: req.user.current_project } },
      {
        $unwind: "$sequences"
      },
      {
        $project: {
          _id: 0,
          sequences: { sequence: 1 }
        }
      }
    ]);
    const names = seqs.map(sequenceUnwound => {
      return sequenceUnwound.sequences;
    });
    res.status(200).json({ success: true, sequences: names });
  } catch (err) {
    winston.log("error", "err:", err);
    res.status(500).json({ success: false });
  }
});
router.get("/getImage", ensure.ensureLoggedIn(), async (req, res, next) => {
  let seq = req.user.last_seq; // ObjectId
  let idx = req.user.last_idx; // Index
  let project_id = req.user.current_project;
  try {
    if (project_id == null || seq == null) {
      throw "404";
    }
    let avail = await mongoose.Projects.aggregate([
      { $match: { project_id } },
      { $unwind: "$sequences" },
      { $match: { "sequences._id": mongoose.ObjectId(seq) } },
      {
        $project: {
          sequences: { sequence: 1 },
          images: { $slice: ["$sequences.images", idx, 1] },
          count: { $size: "$sequences.images" }
        }
      }
    ]);
    if (avail == null || avail.length === 0 || avail[0].images.length === 0) {
      res.status(200).json({ success: false, error: "no photo that matches" });
    } else {
      if (
        !fs.existsSync(
          __dirname +
            `/../uploads/${project_id}/${avail[0].sequences.sequence}/${
              avail[0].images[0].file
            }`
        )
      ) {
        return res
          .status(500)
          .json({ success: false, error: "image file does not exist" });
      }
      // only one images subdocument should have been returned by slice
      let imageBuffer = fs.readFileSync(
        __dirname +
          `/../uploads/${project_id}/${avail[0].sequences.sequence}/${
            avail[0].images[0].file
          }`
      );
      res.status(200).json({
        success: true,
        imageid: avail[0].images[0]._id.toString(),
        image: "data:image/jpeg;base64," + imageBuffer.toString("base64"),
        sequence: avail[0].sequences.sequence,
        index: idx,
        count: avail[0].count
      });
    }
  } catch (error) {
    winston.log("error", "oops error for userid:", req.user.id, error);
    res.status(500).json({ success: false, error: "something happened, oops" });
  }
});

function emailMeetsCriteria(email) {
  return email.match(regexpEmail);
}

function passwordMeetsCriteria(password) {
  return password.length >= 16 && password.length <= 60;
}
function organizeClassifications(boxes, divX = 2, divY = 2) {
  let boxesOrganized = [];
  for (let i = 0; i < divX * divY; i++) {
    boxesOrganized.push([]);
  }
  for (let box of boxes) {
    let rectX = Math.floor(box.x * divX);
    let rectY = Math.floor(box.y * divY); // both are 0 based so no -1
    let boxPos = rectY * divX + rectX;
    boxesOrganized[boxPos].push(box);
  }
  let continuous = [];
  for (let i = 0; i < divX * divY; i++) {
    boxesOrganized[i].sort((a, b) => {
      if (a.type_key < b.type_key) {
        return -1;
      }
      if (a.type_key > b.type_key) {
        return 1;
      }
      return 0;
    });
    continuous = continuous.concat(boxesOrganized[i]);
  }
  return continuous;
}
module.exports = router;
