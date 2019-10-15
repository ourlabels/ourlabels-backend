"use strict";
const argon2 = require("argon2");
/**
 * Just for dev use, no user seeders in production
 */
module.exports = {
  up: (queryInterface, Sequelize) => {
    if (process.env.NODE_ENV === "development") {
      argon2
        .hash("somepassword")
        .then(hashed => {
          return queryInterface.bulkInsert("Users", [
            {
              username: "eliadmin",
              password: hashed,
              email: "eli.j.selkin@gmail.com",
              role: "ROLE_OWNER"
            },
            {
              username: "eliuser",
              password: hashed,
              email: "lepetitp10@gmail.com",
              role: "ROLE_USER"
            }
          ]);
        })
        .catch(error => {});
    }
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("Users", null, {});
  }
};
