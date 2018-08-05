module.exports = {
  title: {
    in: ["body"],
    exists: true,
    isAlphanumeric: true
  },
  description: {
    in: ["body"],
    exists: true,
    isAlphanumeric: true
  },
  full_description: {
    in: ["body"],
    exists: true,
    isAlphanumeric: true
  },
  public: {
    in: ["body"],
    exists: true,
    isBoolean: true
  },
  type: {
    in: ["body"],
    exists: true,
    isInt: {
      options: {
        min: 0
      }
    }
  }
};
