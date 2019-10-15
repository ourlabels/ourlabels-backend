"use strict";
module.exports = (sequelize, DataTypes) => {
  const Users = sequelize.define(
    "Users",
    {
      role: {
        type: DataTypes.ENUM("ROLE_USER", "ROLE_OWNER", "ROLE_SITE_ADMIN"),
        allowNull: false,
        defaultValue: "ROLE_USER"
      },
      username: { type: DataTypes.STRING, unique: true, allowNull: false },
      password: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, unique: true, allowNull: false },
      score: { type: DataTypes.INTEGER, defaultValue: 0 },
      last_seq: DataTypes.STRING,
      last_idx: DataTypes.INTEGER,
      owned_projects: {
        type: DataTypes.ARRAY({
          type: DataTypes.INTEGER,
          references: {
            model: "Projects",
            key: "id"
          }
        }),
        defaultValue: []
      },
      favorited_projects: {
        type: DataTypes.ARRAY({
          type: DataTypes.INTEGER,
          references: {
            model: "Projects",
            key: "id"
          }
        }),
        defaultValue: []
      },
      current_project: {
        type: DataTypes.INTEGER,
        references: { model: "Projects", key: "id" },
        allowNull: true
      },
      joined: {
        type: DataTypes.ARRAY({
          type: DataTypes.INTEGER,
          references: {
            model: "Projects",
            key: "id"
          }
        }),
        defaultValue: []
      }
    },
    {}
  );
  Users.associate = function(models) {
    // associations can be defined here
  };
  return Users;
};
