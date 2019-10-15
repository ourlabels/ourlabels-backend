"use strict";

module.exports = {
  up: (queryInterface, DataTypes) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('Users', { id: Sequelize.INTEGER });
    */
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn("Users", "name", { transaction: t }),
        queryInterface.addColumn(
          "Users",
          "role",
          {
            type: DataTypes.ENUM("ROLE_USER", "ROLE_OWNER", "ROLE_SITE_ADMIN", "ROLE_BARRED"),
            allowNull: false,
            defaultValue: "ROLE_USER"
          },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Users",
          "username",
          { type: DataTypes.STRING, unique: true, allowNull: false },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Users",
          "password",
          { type: DataTypes.STRING, allowNull: false },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Users",
          "email",
          { type: DataTypes.STRING, unique: true, allowNull: false },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Users",
          "score",
          { type: DataTypes.INTEGER, defaultValue: 0 },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Users",
          "last_seq",
          { type: DataTypes.STRING, allowNull: true },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Users",
          "last_idx",
          { type: DataTypes.INTEGER, allowNull: true },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Users",
          "owned_projects",
          {
            type: DataTypes.ARRAY({
              type: DataTypes.INTEGER,
              references: {
                model: "Projects",
                key: "id"
              }
            }),
            defaultValue: []
          },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Users",
          "favorited_projects",
          {
            type: DataTypes.ARRAY({
              type: DataTypes.INTEGER,
              references: {
                model: "Projects",
                key: "id"
              }
            }),
            defaultValue: []
          },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Users",
          "joined",
          {
            type: DataTypes.ARRAY({
              type: DataTypes.INTEGER,
              references: {
                model: "Projects",
                key: "id"
              }
            }),
            defaultValue: []
          },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Users",
          "current_project",
          {
            type: DataTypes.INTEGER,
            references: { model: "Projects", key: "id" },
            allowNull: true
          },
          { transaction: t }
        )
      ]);
    });
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('Users');
    */
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn("Users", "role", { transaction: t }),
        queryInterface.removeColumn("Users", "username", { transaction: t }),
        queryInterface.removeColumn("Users", "password", { transaction: t }),
        queryInterface.removeColumn("Users", "email", { transaction: t }),
        queryInterface.removeColumn("Users", "score", { transaction: t }),
        queryInterface.removeColumn("Users", "last_seq", { transaction: t }),
        queryInterface.removeColumn("Users", "last_idx", { transaction: t }),
        queryInterface.removeColumn("Users", "favorited_projects", {
          transaction: t
        }),
        queryInterface.removeColumn("Users", "current_project", {
          transaction: t
        }),
        queryInterface.removeColumn("Users", "joined", { transaction: t }),
        queryInterface.addColumn(
          "Users",
          "name",
          { type: DataTypes.STRING },
          { transaction: t }
        )
      ]);
    });
  }
};
