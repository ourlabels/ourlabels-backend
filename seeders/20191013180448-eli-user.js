"use strict";
const argon2 = require("argon2");
/**
 * Just for dev use, no user seeders in production
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (process.env.NODE_ENV === "development") {
      return queryInterface.bulkInsert("Users", [
        {
          username: "eliadmin",
          password: await argon2.hash("somepassword"),
          email: "eli.j.selkin@gmail.com",
          role: "ROLE_OWNER",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          username: "eliuser",
          password: await argon2.hash("somepassword"),
          email: "lepetitp10@gmail.com",
          role: "ROLE_USER",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
    }
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("Users", null, {});
  }
};
