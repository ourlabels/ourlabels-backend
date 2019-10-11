const { Sequelize } = require("sequelize");
const { CreateUsers } = require("./Users")
const { CreateProjects } = require("./Projects")
const { CreateProjectTypes } = require("./ProjectTypes")
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
const Users = CreateUsers(sequelize)
const Projects = CreateProjects(sequelize)
const ProjectTypes = CreateProjectTypes(sequelize)

sequelize.sync();

module.exports = { Users, Projects, ProjectTypes };
