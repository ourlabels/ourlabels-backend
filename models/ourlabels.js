"use strict";
module.exports = (sequelize, DataTypes) => {
  var ourlabels = sequelize.define(
    "ourlabelusers",
    {
      role: {type: DataTypes.STRING, allowNull: false, defaultValue: "ROLE_USER"},
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
      joined: DataTypes.ARRAY({ type: DataTypes.INTEGER, references: {
        model: "projects",
        key: "id"
      }})
    },
    {}
  );
  ourlabels.associate = function(models) {
    // associations can be defined here
  };
  return ourlabels;
};
