const fs = require("fs");
const ensure = require("connect-ensure-login");
const winston = require("winston");
const express = require("express");
const router = express.Router();
const mongoose = require("../../../models/mongoose");
const AWS = require('aws-sdk');
AWS.config.update({
  "accessKeyId": process.env.AWS_ACCESS_KEY_S3,
  "secretAccessKey": process.env.AWS_SECRET_ACCESS_KEY_S3,
})
const s3 = new AWS.S3({
  apiVersion: '2006-03-01', region: 'us-east-2'
});

router.get("/", ensure.ensureLoggedIn(), async (req, res) => {
  let seq = req.user.last_seq; // ObjectId
  let idx = req.user.last_idx; // Index
  let project_id = req.user.current_project;
  try {
    if (project_id == null || seq == null) {
      throw "400";
    }
    let avail = await mongoose.Projects.aggregate([
      { $match: { project_id } },
      { $unwind: "$sequences" },
      { $match: { "sequences._id": mongoose.ObjectId(seq) } },
      { $sort: { "sequences.images.file": 1 } },
      {
        $project: {
          sequences: { sequence: 1 },
          images: { $slice: ["$sequences.images", idx, 1] },
          count: { $size: "$sequences.images" }
        }
      }
    ]);
    if (avail == null || avail.length === 0 || avail[0].images.length === 0) {
      res.status(404).json({ success: false, error: "no photo that matches" });
    } else {
      let bucketParams = { Bucket: `ourlabels-${project_id}-${avail[0].sequences.sequence}` }
      bucketParams.Key = avail[0].images[0].file
      s3.getObject(bucketParams, (err, data) => {
        if (err) return res.status(500).json({ success: false, error: "unable to find image" })
        return res.status(200).json({
          success: true,
          image: "data:image/jpeg;base64," + data.Body.toString("base64"),
          imageid: avail[0].images[0]._id.toString(),
          sequence: avail[0].sequences.sequence,
          index: idx,
          count: avail[0].count
        });
      })
      // only one images subdocument should have been returned by slice
    }
  } catch (error) {
    winston.log("error", "oops error for userid:", req.user.id, error);
    if (error === "400") {
      return res.status(400).json({ success: false, error: "Project or sequence not found, select a project first" });
    } else if (error == "404") {
      return res.status(404).json({ success: false, error: "No image found that you have not annotated" });
    }
    return res.status(500).json({ success: false, error: `something happened serverside, oops: ${error}` });
  }
});

module.exports = router