const express = require("express");
const winston = require("winston");
const ensure = require("connect-ensure-login");
const router = express.Router();
const mongoose = require("../../../model/mongooseModels");

router.post("/", ensure.ensureLoggedIn(), async (req, res) => {
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
});

module.exports = router;
