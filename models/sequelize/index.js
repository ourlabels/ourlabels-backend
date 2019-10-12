const { DataTypes, Model, Sequelize } = require("sequelize");
const {
  POSTGRES_USER,
  POSTGRES_DB,
  POSTGRES_PASSWORD,
  POSTGRES_HOST
} = process.env;
const sequelize = new Sequelize(POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, {
  host: POSTGRES_HOST,
  dialect: "postgres"
});

class Users extends Model {}
Users.init(
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
      type: DataTypes.INTEGER,
      references: {
        model: "projects",
        key: "id"
      }
    })
  },
  { sequelize, modelName: "ourlabelusers" }
);

class Projects extends Model {}
Projects.init(
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

sequelize.sync();

module.exports = { Users, Projects, ProjectTypes };
