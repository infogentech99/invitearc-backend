import dotenv from "dotenv";
import connectDB from "./config/db.js";
import Admin from "./models/Admin.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const name = process.env.ADMIN_NAME || "InviteArc Admin";

    const existingAdmin = await Admin.findOne({ name });

    if (existingAdmin) {
      console.log("✅ Admin name already exists:", name);
      process.exit(0);
    }

    await Admin.create({ name });

    console.log("✅ Admin name seeded:", name);
    console.log("✅ Admin email:", process.env.ADMIN_EMAIL || "admin@invitearc.com");
    console.log("✅ Admin password is read from environment only.");
    process.exit(0);
  } catch (error) {
    console.error("Admin seed failed:", error);
    process.exit(1);
  }
};

seedAdmin();
