const express = require("express");
const router = express.Router();
const login = require("./login")
const logout = require("./logout");
const signup = require("./signup")
const user = require("./user")

router.use("/login", login);
router.use("/user", user);
router.use("/signup", signup)
router.use("/logout", logout)

module.exports = router