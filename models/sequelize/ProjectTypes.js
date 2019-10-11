const { Model, DataTypes } = require("sequelize");

/**
 *
 * @param {Sequelize} sequelize Sequelize instance
 */
const CreateProjectTypes = sequelize => {
  class ProjectTypes extends Model {}
  ProjectTypes.init(
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
    { sequelize, modelName: "project_types" }
  );
  return ProjectTypes;
};

module.exports = { CreateProjectTypes };
