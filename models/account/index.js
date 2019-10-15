const argon2 = require("argon2");
const winston = require("winston");
const db = require("../sequelize");
const Op = require("sequelize").Op;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "testing" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" })
  ]
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple()
    })
  );
}

async function authenticate(req, username, password, done) {
  try {
    let user = await db.Users.findOne({
      where: { username: { [Op.eq]: username } }
    });
    if (!user) {
      user = await db.Users.findOne({ where: { email: { [Op.eq]: username } } });
      if (!user) {
        return done(false, null);
      }
    }
    const valid = await argon2.verify(user.password, password);
    if (valid) {
      return done(null, user)
    }
    return done(null, false)
  } catch (err) {
    logger.error(`LOGIN ERROR: ${JSON.stringify(err)}`)
    return done(false, null)
  }
}

function serializeUser(user, cb) {
  var sessionUser = { id: user.id, username: user.username, email: user.email };
  cb(null, sessionUser);
}

function deserializeUser(sessionUser, cb) {
  db.Users.findOne({ where: { id: { [Op.eq]: sessionUser.id } } })
    .then(user => {
      cb(null, user);
    })
    .catch(err => {
      if (err) {
        return cb(err);
      }
    });
}

module.exports = { authenticate, serializeUser, deserializeUser };
