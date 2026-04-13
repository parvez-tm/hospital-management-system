require("dotenv").config();
const { sequelize, connectDB } = require("./config/db");
const { User } = require("./models");

const seedUsers = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });

    const users = [
      {
        name: "Super Admin",
        email: "admin@system.com",
        username: "admin",
        password: "admin123",
        contactNo: "0000000000",
        role: "admin",
      },
      {
        name: "Dr. Smith",
        email: "dr_smith@system.com",
        username: "dr_smith",
        password: "password",
        contactNo: "1111111111",
        role: "doctor",
      },
      {
        name: "John Doe",
        email: "john_doe@system.com",
        username: "john_doe",
        password: "password",
        contactNo: "2222222222",
        role: "patient",
      },
    ];

    for (const userData of users) {
      const existing = await User.findOne({
        where: { username: userData.username },
      });

      if (existing) {
        console.log(`${userData.role} (${userData.username}) already exists`);
        continue;
      }

      await User.create(userData);
      console.log(`${userData.role} (${userData.username}) created`);
    }

    console.log("\nSeeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding users:", error.message);
    process.exit(1);
  }
};

seedUsers();