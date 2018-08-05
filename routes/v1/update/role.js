const express = require("express");
const router = express.Router();
const ensure = require("connect-ensure-login");
const db = require("../../../models");
const Op = db.Sequelize.Op;

router.post("/", ensure.ensureLoggedIn(), async (req, res) => {
  if (
    req.body.username == null ||
    req.body.username === "" ||
    req.body.role_to_change_to == null ||
    req.body.role_to_change_to === "" ||
    !["ROLE_ADMIN", "ROLE_MANAGER", "ROLE_OWNER"].includes(req.user.role)
  ) {
    return res.status(400).json({
      success: false,
      error: "Incorrect attributes or role is not adequate"
    });
  }
  try {
    let roles = ["ROLE_USER", "ROLE_ADMIN", "ROLE_MANAGER", "ROLE_OWNER"];
    let user_to_change = db.ourlabelusers.findOne({
      where: { username: { [Op.eq]: req.body.username } }
    });
    if (
      roles.indexOf(user_to_change.role) >= roles.indexOf(req.user.role) ||
      roles.indexOf(req.body.role_to_change_to) >= roles.indexOf(req.user.role)
    ) {
      // can only make somebody one less than your role. Owner's can only make up to Managers
      // Managers's can only make up to Admins,
      throw "400";
    }
    if (!user_to_change) {
      throw "404";
    }
    let role = req.body.role_to_change_to;
    await user_to_change.update({ role });
    return res.status(200).json({ success: true });
  } catch (err) {
    if (err === "400") {
      return res.status(400).json({
        success: false,
        error: "Can only change user to below your current role."
      });
    } else if (err === "404") {
      return res.status(400).json({ success: false, error: "User not found" });
    }
    return res
      .status(500)
      .json({ success: false, error: `System error: ${err}` });
  }
});

module.exports = router