"use strict";

module.exports = {
  up: (queryInterface, DataTypes) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn("ProjectTypes", "name", { transaction: t }),
        queryInterface.addColumn(
          "ProjectTypes",
          "type",
          { type: DataTypes.STRING },
          { transaction: t }
        ),
        queryInterface.addColumn(
          "ProjectTypes",
          "sequences_are_video",
          { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
          { transaction: t }
        )
      ]);
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn("ProjectTypes", "type", { transaction: t }),
        queryInterface.removeColumn("ProjectTypes", "sequences_are_video", {
          transaction: t
        }),
        queryInterface.addColumn(
          "ProjectTypes",
          "name",
          { type: DataTypes.STRING },
          { transaction: t }
        )
      ]);
    });
  }
};
