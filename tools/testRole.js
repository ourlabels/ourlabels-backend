const db = require("../models");
const winston = require("winston")
db.ourlabelusers.findAll({}).then(users => {
  for (let user of users) {
    winston.log("info", user.role, typeof user.role)
  }
})
