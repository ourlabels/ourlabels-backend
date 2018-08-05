const express = require("express");
const router = express.Router();
const ensure = require("connect-ensure-login");
const { validationResult, checkSchema } = require("express-validator/check");
const db = require("../../../models");
const Op = db.Sequelize.Op;
const { typeSchema } = require("../../constants");

router.post(
  "/",
  ensure.ensureLoggedIn(),
  checkSchema(typeSchema),
  async (req, res) => {
    try {
      if (req.user.role !== "ROLE_ADMIN") {
        throw "401";
      }
      if (validationResult(req).array().length > 0) {
        throw "400";
      }
      let type = db.project_types.findOne({
        where: { title: { [Op.eq]: req.body.title } }
      });
      if (type) {
        throw "300";
      }
      let new_type = db.project_types.build({
        title: req.body.title,
        video: req.body.video
      });
      await new_type.save();
      return res.status(200).json({ success: true, type: new_type });
    } catch (err) {
      if (err === "300") {
        return res
          .status(400)
          .json({ success: false, error: `Type already exists` });
      } else if (err === "400") {
        let error = validationResult(req).array();
        return res.status(400).json({
          success: false,
          error
        });
      } else if (err === "401") {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
      return res
        .status(500)
        .json({ success: false, error: `Server error: ${err}` });
    }
  }
);

module.exports = router;
