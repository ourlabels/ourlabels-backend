const express = require("express");
const router = express.Router();
const ensure = require("connect-ensure-login");
const mongoose = require("../../../model/mongooseModels");
const { validationResult, checkSchema } = require("express-validator/check");
const { getAnnotationsSchema } = require("../../constants");

router.get(
  "/",
  ensure.ensureLoggedIn(),
  checkSchema(getAnnotationsSchema),
  async (req, res) => {
    if (validationResult(req).array().length > 0) {
      throw "400";
    }
    let seq = req.user.last_seq; // ObjectId String
    let offset = parseInt(req.query.offset);
    let project_id = req.user.current_project;
    try {
      if (project_id == null || seq == null || req.user.last_idx == null) {
        throw "404";
      }
      let idx = req.user.last_idx + offset; // Index
      let avail = await mongoose.Projects.aggregate([
        { $match: { project_id } },
        { $unwind: "$sequences" },
        { $match: { "sequences._id": mongoose.ObjectId(seq) } },
        {
          $project: {
            images: { $slice: ["$sequences.images", idx, 1] }
          }
        },
        { $unwind: "$images" }
      ]);
      const classifications = avail[0].images.classifications;
      let boxes = [];
      if (avail[0].images.classifications.length !== 0) {
        boxes = classifications[classifications.length - 1].boxes;
      }
      return res.status(200).json({ success: true, boxes, idx });
    } catch (err) {
      if (err === "400") {
        return res
          .status(400)
          .json({ success: false, error: validationResult(req).array() });
      } else if (err === "404") {
        return res.status(404).json({
          success: false,
          error: "Could not find current sequence or index"
        });
      }
      return res.status(500).json({ success: false, error: err });
    }
  }
);

module.exports = router;
