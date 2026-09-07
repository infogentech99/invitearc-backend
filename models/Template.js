import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
  {
    title: String,
    slug: {
      type: String,
      unique: true,
      index: true, 
    },
    indprice: Number,
    usaprice:Number,
    category: String,
    previewImage: String,
    componentKey: String,
    defaultData: { 
      type: Object,
      default: {},
    },
  },
  { timestamps: true },
);

export default mongoose.model("Template", templateSchema);
