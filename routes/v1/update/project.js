const fs = require("fs");
const rimraf = require("rimraf");
const express = require("express");
const multer = require("multer");
const winston = require("winston");
const ensure = require("connect-ensure-login");
const mongoose = require("../../../models/mongoose");
const db = require("../../../models/sequelize");
const Op = require("sequelize").Op;
const router = express.Router();
const { MAX_SIZE } = require("../../constants");
const { processSeqImages, listAllKeys, deleteBucket } = require("../../utils");
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "testing" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" })
  ]
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple()
    })
  );
}

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function(req, file, cb) {
    logger.error(file);
    if (/.png|.jpg|.jpeg/.test(file.originalname.toLowerCase())) {
      cb(null, `${req.user.id}-${Date.now()}.jpg`.toLowerCase());
    } else if (
      /.mp4|.mpeg|.mpg|.ts|.m2v/.test(file.originalname.toLowerCase())
    ) {
      cb(null, file.originalname.toLowerCase());
    } else if (
      /.tar.bz2|.tbz2|.tar.gz|.tgz/.test(file.originalname.toLocaleLowerCase())
    ) {
      cb(null, file.originalname.toLocaleLowerCase());
    } else {
      cb(null, "x");
    }
  }
});

const upload = multer({
  limits: {
    fileSize: MAX_SIZE
  },
  storage: storage
});
const completeNewSeqs = async (
  files,
  newSeqs,
  user,
  projectId,
  sequences,
  mongoProject
) => {
  for (const newSeq of newSeqs) {
    const newDirectory = `uploads/${projectId}/${newSeq.newName}`;
    if (fs.existsSync(newDirectory)) {
      // maybe there was an old sequence with the same name that somehow didn't get deleted
      // in the delete process
      rimraf.sync(newDirectory);
    }
    fs.mkdirSync(newDirectory, { recursive: true });
    try {
      const images = await processSeqImages(
        files,
        newSeq,
        newDirectory,
        user.id,
        projectId
      );
      sequences.push({
        sequence: newSeq.newName,
        video: newSeq.newVideo,
        images,
        segmentsX: newSeq.newHSplit,
        segmentsY: newSeq.newVSplit
      });
    } catch (error) {
      logger.error(
        `Could not complete completeNewSeqs because of error in processSeqImages for project:${projectId} from user:${user.id}. ${error}`
      );
    }
  }
  mongoProject.sequences = sequences;
  await mongoProject.save();
};
router.post(
  "/",
  ensure.ensureLoggedIn(),
  upload.array("files"),
  async (req, res) => {
    logger.error("HERE IN POST: /update/project");
    try {
      let projectId = req.user.current_project;
      if (process.env.DEBUG === "true") {
        logger.error(`PROJECT ID: ${projectId}`);
      }
      const {
        publicType,
        owner,
        description,
        full_description,
        projectType
      } = req.body;
      if (process.env.DEBUG === "true") {
        logger.error(
          `${publicType}, ${owner}, ${description}, ${full_description}, ${projectType}`
        );
      }
      if (
        !projectId ||
        publicType == null ||
        !owner ||
        !description ||
        !full_description ||
        !projectType
      ) {
        return res
          .status(400)
          .json({ success: false, error: "Incorrect parameters" });
      }
      let project = await db.Projects.findOne({
        where: {
          [Op.and]: [
            { id: { [Op.eq]: projectId } },
            { owner: { [Op.eq]: req.user.id } }
          ]
        }
      });
      if (!project) {
        throw "404";
      }
      let reqallowed = [];
      if (req.body.allowed && Array.isArray(req.body.allowed)) {
        reqallowed = req.body.allowed;
      }
      let allowedUsers = [];
      if (reqallowed.length > 0) {
        allowedUsers = await db.Users.findAll({
          where: { username: { [Op.in]: reqallowed } }
        });
      }
      let reqrefused = [];
      if (req.body.refused && Array.isArray(req.body.refused)) {
        reqrefused = req.body.refused;
      }
      let refusedUsers = [];
      if (reqrefused.length > 0) {
        refusedUsers = await db.Users.findAll({
          where: { username: { [Op.in]: reqrefused } }
        });
      }
      for (let refusedUser of refusedUsers) {
        let joined = refusedUser.joined;
        let idx = joined.indexOf(project.id);
        if (idx >= 0) {
          joined.splice(idx);
        }
        let currentProject = refusedUser.current_project;
        if (currentProject === project.id) {
          currentProject = null;
        }
        // don't wait for these async actions
        refusedUser.update({
          current_project: currentProject,
          joined
        });
      }
      let reqrequested = [];
      if (req.body.requested && Array.isArray(req.body.requested)) {
        reqrequested = req.body.requested;
      }
      let requestedUsers = [];
      if (reqrequested.length > 0) {
        requestedUsers = await db.Users.findAll({
          where: { username: { [Op.in]: reqrequested } }
        });
      }
      let allowed = allowedUsers.map(user => {
        return user.id;
      });
      let refused = refusedUsers.map(user => {
        return user.id;
      });
      let requested = requestedUsers.map(user => {
        return user.id;
      });
      let projectOwner = project.owner;
      let newOwner = await db.Users.findOne({
        where: { username: { [Op.eq]: owner } }
      });
      if (newOwner) {
        projectOwner = newOwner.id;
      }

      let newType = await db.ProjectTypes.findOne({
        where: { id: { [Op.eq]: projectType } }
      });
      let newProjectType = project.type;
      if (newType) {
        newProjectType = newType.id;
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
      // arrays of objects
      if (process.env.DEBUG === "true") {
        logger.error(`NEW: ${req.body.new}`);
        logger.error(`DELETE: ${req.body.delete}`);
      }
      let newSeqs = JSON.parse(req.body.new);
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
      if (process.env.DEBUG === "true") {
        logger.error("Split toSave, toDelete");
      }
      sequences = toSave;
      for (let seqToDelete of toDelete) {
        rimraf.sync(`uploads/${project.id}/${seqToDelete.sequence}/`);
        listAllKeys(
          null,
          project.id,
          seqToDelete.sequence,
          "",
          [],
          deleteBucket
        );
      }
      if (process.env.DEBUG === "true") {
        logger.error(
          `Before completeNewSeqs ${req.files.length}::: ${newSeqs.length}::: 
          ${req.user}::: ${projectId}:::
          ${sequences}::: ${mongoProject}`
        );
      }
      // Done asynchronously, takes too long to do synchronously
      if (newSeqs.length > 0) {
        completeNewSeqs(
          req.files,
          newSeqs,
          req.user,
          projectId,
          sequences,
          mongoProject
        );
      }
      if (process.env.DEBUG === "true") {
        logger.error(
          `${publicType}::: ${newProjectType}::: 
           ${description}::: ${full_description}:::
           ${projectOwner}::: ${JSON.stringify(allowed)}:::
           ${JSON.stringify(requested)}`
        );
      }
      await project.update({
        public: publicType,
        type: newProjectType,
        description,
        full_description,
        owner: projectOwner,
        allowed,
        requested,
        refused
      });
      res.status(200).json({ success: true });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ success: false });
    }
  }
);

module.exports = router;
