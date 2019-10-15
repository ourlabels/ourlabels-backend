"use strict";

module.exports = {
  up: (queryInterface, DataTypes) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn("Projects", "name", { transaction: t }),
        queryInterface.addColumn(
          "Projects",
          "title",
          { type: DataTypes.STRING },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Projects",
          "allowed",
          {
            type: DataTypes.ARRAY({
              type: DataTypes.INTEGER,
              references: {
                model: "Users",
                key: "id"
              }
            })
          },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Projects",
          "requested",
          {
            type: DataTypes.ARRAY({
              type: DataTypes.INTEGER,
              references: {
                model: "Users",
                key: "id"
              },
              defaultValue: []
            })
          },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Projects",
          "refused",
          {
            type: DataTypes.ARRAY({
              type: DataTypes.INTEGER,
              references: {
                model: "Users",
                key: "id"
              },
              defaultValue: []
            })
          },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Projects",
          "owner",
          {
            type: DataTypes.INTEGER,
            references: { model: "Users", key: "id" }
          },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Projects",
          "description",
          {
            type: DataTypes.STRING
          },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Projects",
          "full_description",
          {
            type: DataTypes.STRING
          },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Projects",
          "type",
          {
            type: DataTypes.INTEGER,
            references: { model: "ProjectTypes", key: "id" }
          },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Projects",
          "featured",
          {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
          },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "Projects",
          "public",
          {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
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
      return queryInterface.dropTable('Projects');
    */
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn("Projects", "title", { transaction: t }),
        queryInterface.removeColumn("Projects", "allowed", { transaction: t }),
        queryInterface.removeColumn("Projects", "requested", {
          transaction: t
        }),
        queryInterface.removeColumn("Projects", "refused", { transaction: t }),
        queryInterface.removeColumn("Projects", "owner", { transaction: t }),
        queryInterface.removeColumn("Projects", "description", {
          transaction: t
        }),
        queryInterface.removeColumn("Projects", "full_description", {
          transaction: t
        }),
        queryInterface.removeColumn("Projects", "type", { transaction: t }),
        queryInterface.removeColumn("Projects", "featured", { transaction: t }),
        queryInterface.removeColumn("Projects", "public", { transaction: t }),
        queryInterface.addColumn(
          "Projects",
          "name",
          { type: DataTypes.STRING },
          { transaction: t }
        )
      ]);
    });
  }
};
