'use strict';
module.exports = (sequelize, DataTypes) => {
  var ourlabels = sequelize.define('ourlabelusers', {
    username: {type: DataTypes.STRING, unique: true, allowNull: false},
    password: {type: DataTypes.STRING, allowNull: false},
    email: {type: DataTypes.STRING, unique: true, allowNull: false},
    score: {type: DataTypes.INTEGER, defaultValue: 0},
    id: {primaryKey: true, type: DataTypes.STRING},
    last_seq: DataTypes.STRING,
    last_idx: DataTypes.INTEGER
  }, {});
  ourlabels.associate = function(models) {
    // associations can be defined here
  };
  return ourlabels;
};