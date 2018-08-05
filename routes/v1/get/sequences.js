const express = require("express");
const winston = require("winston");
const ensure = require("connect-ensure-login");
const mongoose = require("../../../model/mongooseModels");
const router = express.Router();

router.get("/", ensure.ensureLoggedIn(), async (req, res) => {
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

module.exports = router