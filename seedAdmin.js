import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "./config/db.js";
import Admin from "./models/Admin.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const name = process.env.ADMIN_NAME || "InviteArc Admin";
    const email = (process.env.ADMIN_EMAIL || "admin@invitearc.com").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "Admin@123";
    const passwordHash = await bcrypt.hash(password, 10);

    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      await Admin.updateOne(
        { email },
        { $set: { name, password: passwordHash } },
      );
      console.log("✅ Admin already exists:", name);
      console.log("✅ Admin email saved:", email);
      process.exit(0);
    }

    await Admin.create({ name, email, password: passwordHash });

    console.log("✅ Admin name seeded:", name);
    console.log("✅ Admin email saved:", email);
    console.log("✅ Admin password hashed and saved in the database.");
    process.exit(0);
  } catch (error) {
    console.error("Admin seed failed:", error);
    process.exit(1);
  }
};

seedAdmin();
