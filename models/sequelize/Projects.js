"use strict";
module.exports = (sequelize, DataTypes) => {
  const Projects = sequelize.define(
    "Projects",
    {
      title: DataTypes.STRING,
      allowed: DataTypes.ARRAY({
        type: DataTypes.INTEGER,
        references: {
          model: "Users",
          key: "id"
        }
      }),
      requested: DataTypes.ARRAY({
        type: DataTypes.INTEGER,
        references: {
          model: "Users",
          key: "id"
        },
        defaultValue: []
      }),
      refused: DataTypes.ARRAY({
        type: DataTypes.INTEGER,
        references: {
          model: "Users",
          key: "id"
        },
        defaultValue: []
      }),
      owner: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" }
      },
      description: {
        type: DataTypes.STRING
      },
      full_description: {
        type: DataTypes.STRING
      },
      type: {
        type: DataTypes.INTEGER,
        references: { model: "ProjectTypes", key: "id" }
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
  Projects.associate = function(models) {
    // associations can be defined here
  };
  return Projects;
};
