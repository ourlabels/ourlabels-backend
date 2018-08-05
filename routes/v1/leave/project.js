const express = require("express");
const router = express.Router();
const ensure = require("connect-ensure-login");

router.post("/", ensure.ensureLoggedIn(), async (req, res) => {
  try {
    if (req.body.project_id == null || req.body.project_id === "") {
      throw "400";
    }
    if (!req.user.joined.includes(req.body.project_id)) {
      throw "401";
    }
    let joined = req.user.joined;
    let idx = joined.indexOf(req.body.project_id);

    joined.splice(idx, 1);
    let current_project = req.user.current_project;
    if (joined.length > 0) {
      current_project = joined[0];
    } else if (joined.length === 0) {
      current_project = null;
    }
    await req.user.update({
      joined,
      current_project
    });
    return res.status(200).json({ success: true, joined, current_project });
  } catch (err) {
    if (err === "400") {
      return res
        .status(400)
        .json({ success: false, error: "Incorrect attributes" });
    } else if (err === "401") {
      return res
        .status(401)
        .json({ success: false, error: "Project not joined" });
    }
    return res.status(500).json({ success: false, error: err });
  }
});

module.exports = router;
