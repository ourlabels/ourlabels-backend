const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const passport = require("passport");
const Strategy = require("passport-local").Strategy;
const { Users } = require("./models/sequelize");
const Op = require("sequelize").Op;
const bcrypt = require("bcrypt");
const index = require("./routes/index");
const winston = require("winston");
const app = express();
const cors = require("cors");

app.use(cookieParser());
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
morgan.token("id", function getId(req) {
  return req.id;
});
const loggerFormat =
  ':id [:date[web]] ":method :url" :status :response-time ms';
app.use(
  morgan(loggerFormat, {
    skip: function(req, res) {
      return res.statusCode < 400;
    },
    stream: process.stderr
  })
);

app.use(
  morgan(loggerFormat, {
    skip: function(req, res) {
      return res.statusCode >= 400;
    },
    stream: process.stdout
  })
);

var whitelist = /^(https?:\/\/)?ourlabels\.org$/i;
var corsOptions = {
  origin: function(origin, callback) {
    console.log("HERE IN CORS OPTIONS ORIGIN");
    if (process.env.NODE_ENV !== "production") {
      callback(null, true);
    } else {
      if (whitelist.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }
  },
  credentials: true
};

app.options("*", cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  require("express-session")({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true
  })
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(
  new Strategy(function(username, password, cb) {
    Users.findOne({ where: { username: { [Op.eq]: username } } })
      .then(user => {
        if (!user) {
          throw "";
        }
        if (bcrypt.compareSync(password, user.password)) {
          return cb(null, user);
        }
        return cb(null, false);
      })
      .catch(err => {
        if (err === "") {
          Users.findOne({ where: { email: { [Op.eq]: username } } }).then(
            userbyemail => {
              if (!userbyemail) {
                return cb(null, false);
              } else {
                if (bcrypt.compareSync(password, userbyemail.password)) {
                  return cb(null, userbyemail);
                }
                return cb(null, false);
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
        return cb(null, false);
      });
  })
);

passport.serializeUser(function(user, cb) {
  var sessionUser = { id: user.id, username: user.username, email: user.email };
  cb(null, sessionUser);
});

passport.deserializeUser(function(sessionUser, cb) {
  Users.findOne({ where: { id: { [Op.eq]: sessionUser.id } } })
    .then(user => {
      cb(null, user);
    })
    .catch(err => {
      if (err) {
        return cb(err);
      }
    });
});

app.use("/", index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
