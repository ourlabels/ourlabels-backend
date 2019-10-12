const bcrypt = require("bcrypt");
const winston = require("winston");
const { Users } = require("../sequelize");
const Op = require("sequelize").Op;

const wlogger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "testing" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" })
  ]
});

if (process.env.NODE_ENV !== "production") {
  wlogger.add(
    new winston.transports.Console({
      format: winston.format.simple()
    })
  );
}

function authorize(req, username, password, done) {
  Users.findOne({ where: { username: { [Op.eq]: username } } })
    .then(user => {
      if (!user) {
        throw "";
      }
      if (bcrypt.compareSync(password, user.password)) {
        return done(null, user);
      }
      return done(null, false);
    })
    .catch(err => {
      if (err === "") {
        Users.findOne({ where: { email: { [Op.eq]: username } } }).then(
          userbyemail => {
            if (!userbyemail) {
              return done(null, false);
            } else {
              if (bcrypt.compareSync(password, userbyemail.password)) {
                return done(null, userbyemail);
              }
              return done(null, false);
            }
          }
        );
      }
    })
    .catch(err => {
      winston.log(
        "error",
        "error while trying to log in username:",
        username,
        err
      );
      return done(null, false);
    });
}

function serializeUser(user, cb) {
  var sessionUser = { id: user.id, username: user.username, email: user.email };
  cb(null, sessionUser);
}

function deserializeUser(sessionUser, cb) {
  Users.findOne({ where: { id: { [Op.eq]: sessionUser.id } } })
    .then(user => {
      cb(null, user);
    })
    .catch(err => {
      if (err) {
        return cb(err);
      }
    });
}

module.exports = { authorize, serializeUser, deserializeUser };
