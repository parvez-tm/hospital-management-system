const { Sequelize } = require("sequelize");

// PostgreSQL connection
const sequelize = new Sequelize("healthmon", "postgres", "errorlogin", {
  host: "localhost",
  port: 5432,
  dialect: "postgres",
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

module.exports = sequelize;
