"use strict";

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert("ProjectTypes", [
      {
        type: "science",
        sequences_are_video: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        type: "science_videos",
        sequences_are_video: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        type: "civic",
        sequences_are_video: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        type: "civic_videos",
        sequences_are_video: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("ProjectTypes", null, {});
  }
};
