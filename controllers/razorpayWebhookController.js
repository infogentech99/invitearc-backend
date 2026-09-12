import crypto from "crypto";
import Order from "../models/Order.js";
import ClientTemplate from "../models/ClientTemplate.js";
import Template from "../models/Template.js";
import generateSlug from "../utils/generateslug.js";
import User from "../models/User.js";
import { sendMetaPurchaseEvent } from "../utils/metaConversions.js";
import sendPurchaseConfirmationEmails from "../utils/purchaseConfirmationEmail.js";

const generateUniqueCode = () =>
  Math.random().toString(36).slice(2, 7);

const buildClientTemplate = async (userId, template) => {
  const shareSlug = `${generateSlug(template.title)}-${generateUniqueCode()}`;

  return ClientTemplate.create({
    userId,
    templateId: template._id,
    customData: JSON.parse(
      JSON.stringify(template.defaultData || {})
    ),
    shareSlug,
    isPublished: false,
  });
};

export const razorpayWebhook = async (req, res) => {
  try {
    // 1. Get Razorpay webhook signature
    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay webhook signature",
      });
    }

    // 2. Verify webhook signature
    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_WEBHOOK_SECRET
      )
      .update(req.body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay webhook signature",
      });
    }

    // 3. Parse Razorpay webhook body
    const event = JSON.parse(req.body.toString());

    console.log("Razorpay webhook event:", event.event);

    // 4. Only process successful payments
    if (event.event === "order.paid") {
      const razorpayOrder = event.payload.order.entity;
      const payment = event.payload.payment.entity;

      console.log("Payment successful:", {
        orderId: razorpayOrder.id,
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
      });

      // 5. Find our database order
      const dbOrder = await Order.findOne({
        razorpayOrderId: razorpayOrder.id,
      });

      if (!dbOrder) {
        console.error(
          "Order not found in database:",
          razorpayOrder.id
        );

        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // 6. Prevent duplicate processing
      if (dbOrder.status === "PAID") {
        console.log(
          "Order already processed:",
          razorpayOrder.id
        );

        return res.status(200).json({
          success: true,
          received: true,
          message: "Order already processed",
        });
      }

      // 7. Verify amount and currency
      if (
        dbOrder.amount !== payment.amount ||
        dbOrder.currency !== payment.currency
      ) {
        console.error("Payment amount/currency mismatch", {
          dbAmount: dbOrder.amount,
          razorpayAmount: payment.amount,
          dbCurrency: dbOrder.currency,
          razorpayCurrency: payment.currency,
        });

        return res.status(400).json({
          success: false,
          message: "Payment amount or currency mismatch",
        });
      }

      // 8. Find purchased template
      const template = await Template.findById(
        dbOrder.templateId
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      // 9. Create user's editable template
      const clientTemplate = await buildClientTemplate(
        dbOrder.userId,
        template
      );

      // 10. Mark order as PAID
      dbOrder.razorpayPaymentId = payment.id;
      dbOrder.status = "PAID";

      await dbOrder.save();

      console.log("Order marked as PAID:", {
        orderId: dbOrder.razorpayOrderId,
        paymentId: payment.id,
        clientTemplateId: clientTemplate._id,
      });


// 11. Send Purchase event to Meta
const user = await User.findById(dbOrder.userId);

      if (user) {
        await sendPurchaseConfirmationEmails({
          order: dbOrder,
          template,
          user,
          payment,
        });
      }

if (!user) {
  console.error(
    "User not found for Meta Purchase:",
    dbOrder.userId
  );
} else if (!dbOrder.metaPurchaseSent) {
  const metaSent = await sendMetaPurchaseEvent({
    user,
    order: dbOrder,
    payment,
  });

  if (metaSent) {
    dbOrder.metaPurchaseSent = true;
    await dbOrder.save();

    console.log(
      "Meta Purchase event sent successfully:",
      payment.id
    );
  } else {
    console.error(
      "Meta Purchase event failed:",
      payment.id
    );
  }
}



    }

    // 11. Always acknowledge webhook
    return res.status(200).json({
      success: true,
      received: true,
    });
  } catch (error) {
    console.error("Razorpay webhook error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};