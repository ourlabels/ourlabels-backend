const { Model, DataTypes } = require("sequelize");

/**
 * 
 * @param {Sequelize} sequelize Sequelize instance
 */
const CreateProjects = (sequelize) => {
  class Project extends Model { }
  Project.init({
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
      references: { model: "project_types", key: "id" }
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
  { sequelize, modelName: "projects" }
  );
  return Project
}

module.exports = { CreateProjects }