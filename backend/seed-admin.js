require("dotenv").config();
const { sequelize, connectDB } = require("./config/db");
const { User } = require("./models");

const seedAdmin = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });

    // Check if admin already exists
    const existing = await User.findOne({
      where: { username: "admin", role: "admin" },
    });

    if (existing) {
      console.log("Admin user already exists!");
      console.log(`  Username: ${existing.username}`);
      console.log(`  Email: ${existing.email}`);
      process.exit(0);
    }

    const admin = await User.create({
      name: "Super Admin",
      email: "admin@system.com",
      username: "admin",
      password: "admin123",
      contactNo: "0000000000",
      role: "admin",
      hospitalId: null,
    });

    console.log("Admin user created successfully!");
    console.log("  Username: admin");
    console.log("  Password: admin123");
    console.log("  Role: admin");
    console.log("");
    console.log("You can now login with these credentials.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error.message);
    process.exit(1);
  }
};

seedAdmin();
