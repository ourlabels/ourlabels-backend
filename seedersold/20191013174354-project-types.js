'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert("ProjectTypes", [
      {
        type: "science",
        sequences_are_video: false
      },
      {
        type: "science_videos",
        sequences_are_video: true
      },
      {
        type: "civic",
        sequences_are_video: false
      },
      {
        type: "civic_videos",
        sequences_are_video: true
      },
    ]);
  },

  down: (queryInterface, Sequelize) => {
      return queryInterface.bulkDelete('ProjectTypes', null, {});
  }
};
