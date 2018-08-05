const fs = require("fs");
const ensure = require("connect-ensure-login");
const winston = require("winston");
const express = require("express");
const router = express.Router();
const mongoose = require("../../../model/mongooseModels");

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
      {
        $project: {
          sequences: { sequence: 1 },
          images: { $slice: ["$sequences.images", idx, 1] },
          count: { $size: "$sequences.images" }
        }
      }
    ]);
    console.log(avail, __dirname)
    if (avail == null || avail.length === 0 || avail[0].images.length === 0) {
      res.status(404).json({ success: false, error: "no photo that matches" });
    } else {
      if (
        !fs.existsSync(
          __dirname +
            `/../../../uploads/${project_id}/${avail[0].sequences.sequence}/${
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
          `/../../../uploads/${project_id}/${avail[0].sequences.sequence}/${
            avail[0].images[0].file
          }`
      );
      return res.status(200).json({
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
    if (error === "400") {
      return res.status(400).json({ success: false, error: "Project or sequence not found, select a project first" });
    } else if (error == "404") {
      return res.status(404).json({ success: false, error: "No image found that you have not annotated" });
    }
    return res.status(500).json({ success: false, error: `something happened serverside, oops: ${error}` });
  }
});

module.exports = router