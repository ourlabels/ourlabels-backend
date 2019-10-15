const path = require("path");
const cors = require("cors");
const logger = require("morgan");
const express = require("express");
const passport = require("passport");
const bodyParser = require("body-parser");
const session = require("express-session");
const createError = require("http-errors");
const cookieParser = require("cookie-parser");
const LocalStrategy = require("passport-local").Strategy;
const Account = require("./models/account");
const index = require("./routes/index");
const redis = require("redis");
const app = express();

app.use(logger("dev"));
// app.use("/static", express.static(path.join(__dirname, "public", "static")));

/**
 * Redis setup for session storage
 */

let RedisStore = require("connect-redis")(session);
let client = redis.createClient({
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_PASSWORD,
  port: process.env.REDIS_PORT
});

/**
 * Only user application/json body parser... no form encoding
 */
app.use(bodyParser.json());

/**
 * User cookie parser because session is in cookie
 */
app.use(cookieParser());

/**
 * Sessions are in cookie, only give a domain if production
 */
if (process.env.NODE_ENV === "production") {
  app.use(
    session({
      store: new RedisStore({ client }),
      secret: process.env.SECRET,
      saveUninitialized: true,
      resave: false,
      cookie: {
        domain: ".ourlabels.org"
      }
    })
  );
} else {
  app.use(
    session({
      secret: process.env.SECRET,
      saveUninitialized: true,
      resave: false
    })
  );
}

/**
 * Cors configuration
 */
var whitelist = /^https?:\/\/([a-z]+.)?ourlabels.org$/i;
var corsOptions = {
  origin: function(origin, callback) {
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
app.use(cors(corsOptions));

/**
 * Passport configuration... once registered will be found by routes
 */
passport.use(
  "local",
  new LocalStrategy({ passReqToCallback: true }, Account.authenticate)
);
passport.serializeUser(Account.serializeUser);
passport.deserializeUser(Account.deserializeUser);
app.use(passport.initialize());
app.use(passport.session());

/**
 * Add root routes
 */
app.use("/", index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
