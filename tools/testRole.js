const {Users} = require("../models/sequelize");
const winston = require("winston")
Users.findAll({}).then(users => {
  for (let user of users) {
    winston.log("info", user.role, typeof user.role)
  }
})
