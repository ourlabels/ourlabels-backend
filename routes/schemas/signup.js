module.exports = {
  username: {
    in: ['body'],
    exists: true,
    isAlphanumeric: true,
    isLength: { options: { min: 4 } },
    errorMessage: "Username must be an alphanumeric string of at least 4 characters"
  },
  password: {
    in: ['body'],
    exists: true,
    isString: true,
    isLength: { options: { min: 12 } },
    errorMessage: "Password must be a string of at least 12 characters or more"
  },
  email: {
    in: ['body'],
    exists: true,
    isEmail: {
      options: {
        require_tld: true
      }
    },
    errorMessage: "Email must be a valid email address"
  }
};
