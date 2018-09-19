const express = require("express");
const router = express.Router();
const db = require("../../../models");

router.get("/", async (req, res) => {
  try {
    let types = await db.project_types.findAll({});
    let accumulator = [];
    for (let type of types) {
      const type_obj = {
        id: type.id,
        type: type.type,
        video: type.sequences_are_video
      };
      accumulator.push(type_obj);
    }
    
    return res.status(200).json({ success: true, projectTypes: accumulator });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: `Server error: ${err}` });
  }
});

module.exports = router