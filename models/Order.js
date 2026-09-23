import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      required: false,
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      required: true,
    },

    serviceType: {
      type: String,
      enum: ["self-edit", "team-edit", "custom-payment"],
      default: "self-edit",
    },

    orderType: {
      type: String,
      enum: ["template", "custom-payment"],
      default: "template",
    },

    status: {
      type: String,
      enum: ["CREATED", "PAID", "FAILED"],
      default: "CREATED",
    },

    metaPurchaseSent: {
      type: Boolean,
      default: false,
    },

    userConfirmationSent: {
      type: Boolean,
      default: false,
    },

    adminConfirmationSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Order", orderSchema);