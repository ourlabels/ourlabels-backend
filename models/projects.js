"use strict";
module.exports = (sequelize, DataTypes) => {
  var projects = sequelize.define(
    "projects",
    {
      title: DataTypes.STRING,
      allowed: DataTypes.ARRAY({
        type: DataTypes.STRING,
        references: {
          model: "ourlabelusers",
          key: "id"
        }
      }),
      requested: DataTypes.ARRAY({
        type: DataTypes.STRING,
        references: {
          model: "ourlabelusers",
          key: "id"
        },
        defaultValue: []
      }),
      refused: DataTypes.ARRAY({
        type: DataTypes.STRING,
        references: {
          model: "ourlabelusers",
          key: "id"
        },
        defaultValue: []
      }),
      owner: {
        type: DataTypes.STRING,
        references: { model: "ourlabelusers", key: "id" }
      },
      description: {
        type: DataTypes.STRING
      },
      full_description: {
        type: DataTypes.STRING
      },
      type: {
        type: DataTypes.INTEGER,
        references: {model: "project_types", key: "id"},
      },
      featured: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      public: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {}
  );
  projects.associate = function(models) {
    // associations can be defined here
  };
  return projects;
};
