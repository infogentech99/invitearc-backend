import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Admin name is required"],
      unique: [true, "Admin name must be unique"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Admin Email is required"],
      unique: [true, "Admin email must be unique"],
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Admin password is required"],
      trim: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Admin", adminSchema);
