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
const allowed_emails = process.env.ALLOWEDEMAILS.split(",");

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function(req, file, cb) {
    cb(null, req.user.id + "-" + Date.now());
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
      success: 1,
      username: user.username,
      id: user.id,
      score: user.score,
      email: user.email,
      last_seq: user.last_seq,
      last_idx: user.last_idx
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

router.post("/signup", async function(req, res, next) {
  if (
    req.body.username !== undefined &&
    req.body.password !== undefined &&
    req.body.email !== undefined &&
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
      if (!allowed_emails.includes(req.body.email)) {
        throw "emailnotwhitelisted";
      }
      const newUser = db.ourlabelusers.build({
        username: req.body.username,
        password: bcrypt.hashSync(req.body.password, saltRounds),
        email: req.body.email,
        id: uuidv1()
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


router.post(
  "/selectSequence",
  ensure.ensureLoggedIn(),
  async (req, res, next) => {
    if (req.body.seq && req.body.seq !== "") {
      req.user.last_seq = req.body.seq;
      req.user.last_idx = 0;
      try {
        await req.user.save();
        return res.status(200).json(userContent(req.user));
      } catch (err) {
        winston.log("error", "select sequence", err);
        return res
          .status(500)
          .json({ success: false, error: "Could not set user information" });
      }
    } else {
      return res
        .status(400)
        .json({ success: false, error: "Incorrect information" });
    }
  }
);
router.post("/getClassifications", ensure.ensureLoggedIn(), async (req, res, next)=> {
  if (req.body.index === undefined || req.body.index === "" || req.body.seq === undefined || req.body.seq === "") {
    return res.status(400).json({success: false, error: "Incorrect attributes"});
  }
  let index = req.body.index;
  let seq = req.body.seq;
  try {
    let avail = await mongoose.ImageSequences.aggregate([
      { $match: { sequence: seq } },
      {
        $project: {
          images: { $slice: ["$images", index, 1] }
        }
      }
    ]);
    if (
      avail === null ||
      avail === undefined ||
      avail.length === 0 ||
      avail[0].images.length === 0
    ) {
      res.status(200).json({ success: false, error: "no index matches to get classifications" });
    } else {
      // only one images subdocument should have been returned by slice
      res.status(200).json({
        success: true,
        seq: req.body.seq,
        idx: index,
        classifications: avail[0].images[0].classifications
      });
    }
  } catch (error) {
    winston.log("error", "oops error for userid:", req.user.id, error);
    res.status(500).json({ success: false, error: "something happened, oops" });
  }

})
router.post("/updateIndex", ensure.ensureLoggedIn(), async (req, res, next) => {
  if (req.body.idx !== undefined && req.body.idx !== "") {
    console.log(req.body);
    console.log(req.user.last_idx);
    req.user.last_idx = parseInt(req.body.idx);
    try {
      console.log("here in try");
      await req.user.save();
      return res.status(200).json(userContent(req.user));
    } catch (err) {
      winston.log("error", "select index", err);
      return res
        .status(500)
        .json({ success: false, error: "Could not set user information" });
    }
  } else {
    return res
      .status(400)
      .json({ success: false, error: "Incorrect information" });
  }
});

router.get("/user", ensure.ensureLoggedIn(), (req, res, next) => {
  return res.status(200).json(userContent(req.user));
});

router.post("/addRects", ensure.ensureLoggedIn(), async (req, res, next) => {
  try {
    let seq = req.body.seq;
    let idx = req.body.idx;
    let id = req.body.id;
    console.log(id, idx, seq);
    let sequence = await mongoose.ImageSequences.findOne({ sequence: seq });
    if (sequence.images[idx]._id.toString() === id) {
      // upload straight away
      sequence.images[idx].classifications.push({
        userid: req.user.id,
        type: 0,
        boxes: generateBoxesFromBoxes(req.body.boxes),
        date: new Date()
      });
      await sequence.save(); // save the subdocuments too
      return res.status(200).json({ success: true });
    } else {
      idx = 0;
      for (; idx < sequence.images.length; idx++) {
        if (sequence.images[idx]._id.toString() === id) {
          // found
          break;
        }
      }
      if (idx < sequence.images.length) {
        // now upload
        sequence.images[idx].classifications.push({
          userid: req.user.id,
          type: 0,
          boxes: generateBoxesFromBoxes(req.body.boxes),
          date: new Date()
        });
        await sequence.save(); // save the subdocuments too
        return res.status(200).json({ success: true });
      }
    }
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

const generateBoxesFromBoxes = function(boxes) {
  let newBoxes = [];
  for (box of boxes) {
    newBoxes.push({
      width: box.width,
      height: box.height,
      x: box.x,
      y: box.y,
      justCreated: false,
      type_key: box.type.key,
      id: box.id
    });
  }
  return newBoxes;
};

router.post(
  "/addImage",
  ensure.ensureLoggedIn(),
  upload.single("image"),
  async (req, res, next) => {
    let seq = req.body.seq;
    let id = req.body.id;
    let foundSequence = await mongoose.ImageSequences.findOne({
      sequence: seq
    });
    if (foundSequence === null) {
      foundSequence = new mongoose.ImageSequences({
        sequence: seq,
        images: []
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

router.get("/getSequences", ensure.ensureLoggedIn(), async (req, res, next) => {
  try {
    let names = [];
    let seqs = await mongoose.ImageSequences.find({});
    names = seqs.map(seq => {
      return seq.sequence;
    });
    res.status(200).json({ success: true, sequences: names });
  } catch (err) {}
});

router.post("/getImage", ensure.ensureLoggedIn(), async (req, res, next) => {
  winston.log("error", "HERE IN GET IMAGE", req.body);
  let idx;
  if (req.body.index === undefined || req.body.index === null) {
    idx = 0;
    if (req.user.last_idx) {
      idx = req.user.last_idx;
    }
    winston.log("error", "IN GET IMAGE IDX:", idx);
  } else {
    idx = req.body.index;
  }
  let seq = req.body.seq;
  try {
    let avail = await mongoose.ImageSequences.aggregate([
      { $match: { sequence: seq } },
      {
        $project: {
          images: { $slice: ["$images", idx, 1] },
          count: {$size: "$images"}
        }
      }
    ]);
    if (
      avail === null ||
      avail === undefined ||
      avail.length === 0 ||
      avail[0].images.length === 0
    ) {
      res.status(200).json({ success: false, error: "no photo that matches" });
    } else {
      if (
        !fs.existsSync(__dirname + "/../uploads/" + avail[0].images[0].file)
      ) {
        return res
          .status(500)
          .json({ success: false, error: "image file does not exist" });
      }
      // only one images subdocument should have been returned by slice
      let imageBuffer = fs.readFileSync(
        __dirname + "/../uploads/" + avail[0].images[0].file
      );
      console.log("INDEX HERE", idx, req.body.index);
      res.status(200).json({
        success: true,
        seq: req.body.seq,
        idx: idx,
        idxs: avail[0].count,
        imageid: avail[0].images[0]._id.toString(),
        image: "data:image/jpeg;base64," + imageBuffer.toString("base64"),
        classifications: avail[0].images[0].classifications
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
  return (
    password.length >= 16 &&
    password.length <= 60 
  );
}

module.exports = router;
