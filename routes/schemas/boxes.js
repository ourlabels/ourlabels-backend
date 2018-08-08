module.exports = {
  boxes: {
    in: ["body"],
    exists: true,
    isArray: true,
    errorMessage: '"boxes" property must exist and must be array'
  },
  "boxes.*.x": {
    in: ["body"],
    exists: true,
    isFloat: {
      options: {
        min: 0.0,
        max: 1.0
      }
    }
  },
  "boxes.*.y": {
    in: ["body"],
    exists: true,
    isFloat: {
      options: {
        min: 0.0,
        max: 1.0
      }
    }
  },
  "boxes.*.w": {
    in: ["body"],
    exists: true,
    isFloat: {
      options: {
        min: 0.0,
        max: 1.0
      }
    }
  },
  "boxes.*.h": {
    in: ["body"],
    exists: true,
    isFloat: {
      options: {
        min: 0.0,
        max: 1.0
      }
    }
  },
  "boxes.*.type": {
    in: ["body"],
    exists: true,
    isString: true
  },
  "boxes.*.name": {
    in: ["body"],
    exists: true,
    isNumeric: true
  }
};
