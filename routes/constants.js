const MAX_SIZE = 15 * Math.pow(2, 20); // 16 MB limit, but keep to 15 to be safe
const SALT_ROUNDS = 12;
const REGEXP_CAPITAL = /[A-Z]+/;
const REGEXP_LOWERCASE = /[a-z]+/;
const REGEXP_NUMBER = /[0-9]+/;
const REGEXP_SPECIAL = /[\^~!@#$%^&*()[\]\-_+=;:,<>.?/]+/;
const REGEXP_NOT_ALLOWED = /[^^~!@#$%^&*()[\]\-_+=;:,<>.?/0-9A-Za-z]+/;
const projectSchema = require("./schemas/project");
const boxesSchema = require("./schemas/boxes");
const labelsSchema = require("./schemas/labels");
const typeSchema = require("./schemas/type");
const signupSchema = require("./schemas/signup");
const getAnnotationsSchema = require("./schemas/get_annotations")
const indexSchema = require("./schemas/indexschema")
module.exports = {
  MAX_SIZE,
  SALT_ROUNDS,
  REGEXP_CAPITAL,
  REGEXP_LOWERCASE,
  REGEXP_NOT_ALLOWED,
  REGEXP_NUMBER,
  REGEXP_SPECIAL,
  labelsSchema,
  boxesSchema,
  projectSchema,
  typeSchema,
  signupSchema,
  getAnnotationsSchema,
  indexSchema
};
