"use strict";
module.exports = (sequelize, DataTypes) => {
  const ProjectTypes = sequelize.define(
    "ProjectTypes",
    {
      type: {
        type: DataTypes.STRING
      },
      sequences_are_video: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {}
  );
  ProjectTypes.associate = function(models) {
    // associations can be defined here
  };
  return ProjectTypes;
};
