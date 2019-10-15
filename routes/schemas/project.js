module.exports = {
  title: {
    in: ["body"],
    exists: true,
    isAlphanumeric: true
  },
  description: {
    in: ["body"],
    exists: true,
    isString: true
  },
  full_description: {
    in: ["body"],
    exists: true,
    isString: true
  },
  privateType: {
    in: ["body"],
    exists: true,
    isBoolean: true
  },
  projectType: {
    in: ["body"],
    exists: true,
    isInt: {
      options: {
        min: 0
      }
    }
  }
};
