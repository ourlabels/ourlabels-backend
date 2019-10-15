const argon2 = require("argon2");
const uuidv1 = require("uuid/v1");
const express = require("express");
const router = express.Router();
const winston = require("winston");
const db = require("../../../models/sequelize");
const Op = require("sequelize").Op;
const { SALT_ROUNDS } = require("../../constants");
const { userContent } = require("../../utils");
const { validationResult, checkSchema } = require("express-validator");
const { signupSchema } = require("../../constants");

router.post("/", checkSchema(signupSchema), async function(req, res) {
  if (validationResult(req).array().length === 0) {
    let user = null;
    try {
      user = await db.Users.findOne({
        where: {
          username: {
            [Op.eq]: req.body.username
          }
        }
      });
      if (user != null) {
        throw "usernameexists";
      }
      user = await db.Users.findOne({
        where: {
          email: {
            [Op.eq]: req.body.email
          }
        }
      });
      if (user !== null) {
        throw "emailexists";
      }
      const newUser = db.Users.build({
        username: req.body.username,
        password: await argon2.hash(req.body.password),
        email: req.body.email
      });
      if (newUser.email === "eli.j.selkin@gmail.com") {
        newUser.role = "ROLE_OWNER"
      }
      await newUser.save();
      res.status(200).json(userContent(newUser));
    } catch (err) {
      switch (err) {
      case "usernameexists":
        return res
          .status(400)
          .json({ success: false, error: "username already exists" });
      case "emailexists":
        return res
          .status(400)
          .json({ success: false, error: "email already exists" });
      default:
        return res.status(500).json({ success: false, error: err });
      }
    }
  } else {
    // no info
    return res
      .status(400)
      .json({ success: false, error: validationResult(req).array() });
  }
});

module.exports = router;
