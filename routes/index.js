const express = require("express");
const router = express.Router();
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const v1docs = YAML.load(__dirname+"/v1/openapi.yml");
const v1 = require("./v1");

router.use("/v1", v1);
router.use("/v1/docs", swaggerUi.serve, swaggerUi.setup(v1docs));

module.exports = router;
