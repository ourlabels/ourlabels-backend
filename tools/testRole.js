const db = require("../models/sequelize");
const winston = require("winston")
db.Users.findAll({}).then(users => {
  for (let user of users) {
    winston.log("info", user.role, typeof user.role)
  }
})
