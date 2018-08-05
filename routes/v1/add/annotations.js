const express = require("express");
const router = express.Router();
const ensure = require("connect-ensure-login");
const mongoose = require("../../../model/mongooseModels");
const { validationResult, checkSchema } = require("express-validator/check");
const { boxesSchema } = require("../../constants");
const {
  generateBoxesFromBoxes,
  organizeClassifications
} = require("../../utils");

router.post(
  "/",
  ensure.ensureLoggedIn(),
  checkSchema(boxesSchema),
  async (req, res) => {
    try {
      let seq = req.user.last_seq;
      let idx = req.user.last_idx;
      let project_id = req.user.current_project;
      let project = await mongoose.Projects.findOne({ project_id });
      let user_score = req.user.score;
      let seq_index = -1;
      if (validationResult(req).array().length > 0) {
        return res.status(400).json({ error: validationResult(req).array() });
      }
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
  }
);

module.exports = router;
