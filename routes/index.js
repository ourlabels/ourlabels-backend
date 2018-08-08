const express = require("express");
const router = express.Router();
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const v1docs = YAML.load(__dirname + "/v1/openapi.yml");
const v1 = require("./v1");

router.use("/v1", v1);
router.use("/v1/docs", swaggerUi.serve, swaggerUi.setup(v1docs));
router.get("/annotate", (req, res) => {
  res.redirect("/");
});
router.get("/signup", (req, res) => {
  res.redirect("/");
});
router.get("/login", (req, res) => {
  res.redirect("/");
});
router.get("/", (req, res) => {
  res.render("index");
});

module.exports = router;
