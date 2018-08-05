module.exports = {
  labels: {
    in: ["body"],
    exists: true,
    isArray: true,
    errorMessage: '"labels" property must exits and must be an array'
  },
  "labels.*.r": {
    in: ["body"],
    exists: true,
    isInt: {
      options: {
        min: 0,
        max: 255
      }
    },
    errorMessage:
      "Each label object must have a 'r' key which is an integer between 0 and 255"
  },
  "labels.*.g": {
    in: ["body"],
    exists: true,
    isInt: {
      options: {
        min: 0,
        max: 255
      }
    },
    errorMessage:
      "Each label object must have a 'g' key which is an integer between 0 and 255"
  },
  "labels.*.b": {
    in: ["body"],
    exists: true,
    isInt: {
      options: {
        min: 0,
        max: 255
      }
    },
    errorMessage:
      "Each label object must have a 'b' key which is an integer between 0 and 255"
  },
  "labels.*.a": {
    in: ["body"],
    exists: true,
    isFloat: {
      options: {
        min: 0,
        max: 1.0
      }
    },
    errorMessage:
      "Each label object must have a 'a' key which is an integer between 0 and 1.0"
  },
  "labels.*.type": {
    in: ["body"],
    exists: true,
    isString: true,
    errorMessage:
      "Each label object must have a 'type' key which is a string name"
  },
  "labels.*.description": {
    in: ["body"],
    exists: true,
    isString: true,
    errorMessage:
      "Each label object must have a 'description' key which is a string value to describe the type"
  }
};
