import mongoose from "mongoose";

const clientTemplateSchema = mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
    },
    customData: {
      type: Object,
      default: {},
    },
    shareSlug: String,
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("ClientTemplate", clientTemplateSchema);
