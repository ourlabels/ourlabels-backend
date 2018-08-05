const fs = require("fs");
const rimraf = require("rimraf");
const express = require("express");
const multer = require("multer");
const winston = require("winston");
const ensure = require("connect-ensure-login");
const mongoose = require("../../../model/mongooseModels");
const db = require("../../../models");
const Op = db.Sequelize.Op;
const router = express.Router();
const { MAX_SIZE } = require("../../constants");
const { processSeqImages } = require("../../utils");

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function(req, file, cb) {
    if (/.png|.jpg|.jpeg/.test(file.originalname.toLowerCase())) {
      cb(null, `${req.user.id}-${Date.now()}.jpg`.toLowerCase());
    } else if (/.mp4|.mpeg|.mpg|.ts/.test(file.originalname.toLowerCase())) {
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

router.post(
  "/",
  ensure.ensureLoggedIn(),
  upload.array("files"),
  async (req, res) => {
    try {
      let project_id = req.body.project_id;
      let isPublic = req.body.public;
      let project_owner = req.body.owner;
      let description = req.body.description;
      let full_description = req.body.full_description;
      let project_type = req.body.type;
      let testarray = [
        project_id,
        isPublic,
        project_owner,
        description,
        full_description,
        project_type
      ];
      if (testarray.includes(null) || testarray.includes("")) {
        throw "400";
      }
      let project = await db.projects.findOne({
        where: {
          [Op.and]: [
            { id: { [Op.eq]: parseInt(project_id) } },
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
      let owner = project.owner;
      let new_owner = await db.ourlabelusers.findOne({
        where: { username: { [Op.eq]: project_owner } }
      });

      if (new_owner) {
        owner = new_owner.id;
      }

      let new_type = await db.project_types.findOne({
        where: { id: { [Op.eq]: parseInt(project_type) } }
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
        const newDirectory = `uploads/${project.id}/${seq.name}`;
        if (fs.existsSync(`uploads/${project.id}/${updSeq}`)) {
          if (updSeq !== seq.name) {
            fs.renameSync(`uploads/${project.id}/${updSeq}`, newDirectory);
          }
        } else {
          fs.mkdirSync(newDirectory);
        }
        let images = processSeqImages(
          req.files,
          seq,
          newDirectory,
          req.user.id
        );
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
        const newDirectory = `uploads/${project.id}/${seq.name}`;
        if (fs.existsSync(newDirectory)) {
          rimraf.sync(newDirectory);
        }
        fs.mkdirSync(newDirectory);
        const images = processSeqImages(
          req.files,
          seq,
          newDirectory,
          req.user.id
        );
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
      await project.update({
        public: isPublic,
        type,
        description,
        full_description,
        owner,
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
