const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.PG_DATABASE || "hospital_management",
  process.env.PG_USER || "postgres",
  process.env.PG_PASSWORD || "postgres",
  {
    host: process.env.PG_HOST || "localhost",
    port: process.env.PG_PORT || 5432,
    dialect: "postgres",
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL Connected successfully");
  } catch (error) {
    console.error(`Database Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
