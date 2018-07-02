"use strict";
module.exports = (sequelize, DataTypes) => {
  var project_types = sequelize.define(
    "project_types",
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
  project_types.associate = function(models) {
    // associations can be defined here
  };
  return project_types;
};
