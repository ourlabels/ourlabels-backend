const {Model, DataTypes } = require("sequelize");

/**
 * 
 * @param {Sequelize} sequelize Sequelize instance
 */
const CreateUsers = (sequelize) => {
  class User extends Model { }
  User.init(
    {
      role: {
        type: DataTypes.ENUM(
          "ROLE_USER",
          "ROLE_OWNER",
          "ROLE_SITE_ADMIN"
        ), allowNull: false, defaultValue: "ROLE_USER"
      },
      username: { type: DataTypes.STRING, unique: true, allowNull: false },
      password: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, unique: true, allowNull: false },
      score: { type: DataTypes.INTEGER, defaultValue: 0 },
      id: { primaryKey: true, type: DataTypes.STRING },
      last_seq: DataTypes.STRING,
      last_idx: DataTypes.INTEGER,
      owned_projects: DataTypes.ARRAY({
        type: DataTypes.INTEGER,
        references: {
          model: "projects",
          key: "id"
        },
        defaultValue: []
      }),
      favorited_projects: DataTypes.ARRAY({
        type: DataTypes.INTEGER,
        references: {
          model: "projects",
          key: "id"
        },
        defaultValue: []
      }),
      current_project: {
        type: DataTypes.INTEGER,
        references: { model: "projects", key: "id" }
      },
      joined: DataTypes.ARRAY({
        type: DataTypes.INTEGER, references: {
          model: "projects",
          key: "id"
        }
      })
    },
    { sequelize, modelName: "ourlabelusers" }
  );
  return User
}

module.exports = { CreateUsers }