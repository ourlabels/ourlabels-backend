const express = require("express");
const ensure = require("connect-ensure-login");
const mongoose = require("../../../models/mongoose");
const { Users } = require("../../../models/sequelize");
const Op = require("sequelize").Op;
const router = express.Router();

router.post("/", ensure.ensureLoggedIn(), async (req, res) => {
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
    let verified_user = await Users.findOne({
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
    ].verified_id = req.user.id;
    project.sequences[seq_index].images[idx].classifications[
      idx_last_classification
    ].verified_date = req.user.id;
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

module.exports = router;
