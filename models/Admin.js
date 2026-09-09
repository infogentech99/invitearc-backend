import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Admin name is required"],
      unique: [true, "Admin name must be unique"],
      trim: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Admin", adminSchema);
