const fs = require("fs");
const rimraf = require("rimraf");
const express = require("express");
const multer = require("multer");
const winston = require("winston");
const ensure = require("connect-ensure-login");
const mongoose = require("../../../models/mongoose");
const {Users, ProjectTypes, Projects} = require("../../../models/sequelize")
const Op = require("sequelize").Op;
const router = express.Router();
const { MAX_SIZE } = require("../../constants");
const { processSeqImages, listAllKeys, deleteBucket } = require("../../utils");
// const AWS = require("aws-sdk");
// AWS.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY_S3,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_S3
// });
// const s3 = new AWS.S3({
//   apiVersion: "2006-03-01",
//   region: "us-east-2"
// });

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function(req, file, cb) {
    winston.log("error", file);
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
      winston.log(
        "error",
        `Could not complete completeNewSeqs because of error in processSeqImages for project:${projectId} from user:${
          user.id
        }. ${error}`
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
    try {
      let projectId = req.user.current_project;
      let publicType = req.body.publicType;
      let owner = req.body.owner;
      let description = req.body.description;
      let fullDescription = req.body.fullDescription;
      let type = req.body.type;
      let testarray = [
        projectId,
        publicType,
        owner,
        description,
        fullDescription,
        type
      ];
      if (testarray.includes(null) || testarray.includes("")) {
        throw "400";
      }
      let project = await Projects.findOne({
        where: {
          [Op.and]: [
            { id: { [Op.eq]: parseInt(projectId) } },
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
      let allowedUsers = await Users.findAll({
        where: { username: { [Op.in]: reqallowed } }
      });
      let reqrefused = [];
      if (req.body.refused != null) {
        reqrefused = req.body.refused;
      }
      let refusedUsers = await Users.findAll({
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
          currentProject = null;
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
      let requestedUsers = await Users.findAll({
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
      let projectOwner = project.owner;
      let newOwner = await Users.findOne({
        where: { username: { [Op.eq]: owner } }
      });

      if (newOwner) {
        projectOwner = newOwner.id;
      }

      let newType = await ProjectTypes.findOne({
        where: { id: { [Op.eq]: parseInt(type) } }
      });
      let projectType = project.type;
      if (newType) {
        projectType = newType.id;
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
      winston.log('error', `NEW: ${req.body.new}`)
      winston.log('error', `DELETE: ${req.body.delete}`)
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
      // Done asynchronously, takes too long to do synchronously
      completeNewSeqs(
        req.files,
        newSeqs,
        req.user,
        parseInt(projectId),
        sequences,
        mongoProject
      );
      await project.update({
        publicType,
        projectType,
        description,
        fullDescription,
        projectOwner,
        allowed,
        requested,
        refused
      });
      res.status(200).json({ success: true });
    } catch (err) {
      winston.log("error", err);
      res.status(500).json({ success: false });
    }
  }
);

module.exports = router;
