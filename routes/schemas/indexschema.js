const { oneOf, check } = require("express-validator");

module.exports = oneOf([
  [
    check("offset")
      .exists()
      .isInt({ options: { min: 0, max: 0 } }),
    check("toNumber")
      .exists()
      .isInt()
  ],
  [
    check("offset")
      .exists()
      .isInt(),
    check("toNumber").optional()
  ]
]);
