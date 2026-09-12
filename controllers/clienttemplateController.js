import crypto from "crypto";
import Razorpay from "razorpay";
import ClientTemplate from "../models/ClientTemplate.js";
import generateSlug from "../utils/generateslug.js";
import Template from "../models/Template.js";
import sendEmail from "../config/sendEmail.js";
import Order from "../models/Order.js";
import sendPurchaseConfirmationEmails from "../utils/purchaseConfirmationEmail.js";
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const USD_TO_INR_RATE = 82;

//Admin helper to register a new template (like 'hitched') in the system.

export const addTemplateToSystem = async (req, res) => {
  try {
    const { title, indprice, usaprice, defaultData } = req.body;

    const newTemplate = await Template.create({
      title,
      indprice,
      usaprice,
      defaultData,
    });

    res.status(201).json({
      success: true,
      message: "New template added to system successfully",
      data: newTemplate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const generateUniqueCode = () => Math.random().toString(36).slice(2, 7);
const buildClientTemplate = async (user, template) => {
  console.log("Template Default Data:", template.defaultData);
  const shareSlug = `${generateSlug(template.title)}-${generateUniqueCode()}`;
  return ClientTemplate.create({
    userId: user._id,
    templateId: template._id,
    customData: JSON.parse(JSON.stringify(template.defaultData || {})),
    shareSlug,
    isPublished: false,
  });
};

const findExistingPurchase = async (userId, templateId) => {
  return ClientTemplate.findOne({ userId, templateId });
};

// ---- /api/client-templates/buy-template  -----
export const buyTemplate = async (req, res) => {
  try {
    const { templateId } = req.body;

    const template = await Template.findById(templateId);

    if (!template) {
      return res.status(400).json({
        success: false,
        message: "Template not found",
      });
    }

    const clientTemplate = await buildClientTemplate(req.user, template);

    res.status(201).json({
      success: true,
      message: "Template purchased successfully",
      data: clientTemplate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const { templateId, country, serviceType = "self-edit" } = req.body;

    console.log("Country:", country);

    const template = await Template.findById(templateId);

    if (!template) {
      return res.status(400).json({
        success: false,
        message: "Template not found",
      });
    }

    let amount;
    let currency;

    if (country === "IN") {
      amount = Math.round(
        (template.indprice + (serviceType === "team-edit" ? 1000 : 0)) * 100,
      );
      currency = "INR";
    } else {
      amount = Math.round(
        (template.usaprice + (serviceType === "team-edit" ? 20 : 0)) * 100,
      );
      currency = "USD";
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid template price for Razorpay order.",
      });
    }

    // 1. Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency,
      receipt: `ord_${Date.now()}`,
      payment_capture: 1,
    });

    // 2. Save order in our database
    await Order.create({
      userId: req.user._id,
      templateId: template._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      serviceType,
      status: "CREATED",
    });

    console.log("Order saved in DB:", razorpayOrder.id);

    // 3. Send order details to frontend
    res.json({
      success: true,
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
        templateId,
      },
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Unable to create Razorpay order.",
    });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification fields",
      });
    }

    // 1. Verify Razorpay payment signature
    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (signature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay signature",
      });
    }

    // 2. Find our database order
    const order = await Order.findOne({
      razorpayOrderId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // 3. Make sure this order belongs to logged-in user
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized payment verification",
      });
    }

    if (order.status === "PAID") {
      const existingClientTemplate = await ClientTemplate.findOne({
        userId: order.userId,
        templateId: order.templateId,
      }).populate("templateId");

      if (!existingClientTemplate) {
        return res.status(404).json({
          success: false,
          message: "Purchased template not found",
        });
      }

      const existingUser = req.user;
      await sendPurchaseConfirmationEmails({
        order,
        template: existingClientTemplate.templateId,
        user: existingUser,
        payment: {
          id: order.razorpayPaymentId,
          amount: order.amount,
          currency: order.currency,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        data: existingClientTemplate,
      });
    }

    // 4. Create the editable template immediately after payment verification.
    // The webhook can arrive later, so the paid order is used as the idempotency guard.
    const template = await Template.findById(order.templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    const clientTemplate = await buildClientTemplate(order.userId, template);

    // 5. Save payment ID and mark the order complete
    order.razorpayPaymentId = razorpayPaymentId;
    order.status = "PAID";

    await order.save();

    await sendPurchaseConfirmationEmails({
      order,
      template,
      user: req.user,
      payment: {
        id: razorpayPaymentId,
        amount: order.amount,
        currency: order.currency,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: clientTemplate,
    });
  } catch (error) {
    console.error("Payment verification error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//---- /api/client-templates/my-templates -----
export const getMyTemplates = async (req, res) => {
  try {
    const templates = await ClientTemplate.find({
      userId: req.user._id,
    })
      .populate("templateId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//--- /api/client-templates/:id  ------
export const getClientTemplateById = async (req, res) => {
  try {
    const clientTemplate = await ClientTemplate.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("templateId");

    if (!clientTemplate) {
      return res.status(404).json({
        success: false,
        message: "Client template not found",
      });
    }

    res.json({
      success: true,
      data: clientTemplate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// PUT---- /api/client-templates/:id/update-text -----
export const updateTemplateText = async (req, res) => {
  try {
    const { field, value } = req.body;

    if (!field) {
      return res.status(400).json({
        success: false,
        message: "Field name is required for update",
      });
    }

    const updatedTemplate = await ClientTemplate.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      {
        $set: {
          [`customData.${field}`]: value,
        },
      },
      { new: true },
    ).populate("templateId");

    if (!updatedTemplate) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.json({
      success: true,
      message: "Text updated successfully",
      data: updatedTemplate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// PUT ---- /api/client-templates/:id/publish ------
export const publishTemplate = async (req, res) => {
  try {
    const clientTemplate = await ClientTemplate.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      {
        isPublished: true,
      },
      { new: true },
    ).populate("templateId");

    if (!clientTemplate) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.json({
      success: true,
      message: "Template published successfully",
      shareUrl: `/share/${clientTemplate.shareSlug}`,
      data: clientTemplate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// PUT ---- /api/client-templates/:id/update-share ------
export const updateShareSlug = async (req, res) => {
  try {
    const { prefix } = req.body;

    if (!prefix || prefix.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Prefix cannot be empty",
      });
    }

    const sanitizedPrefix = generateSlug(prefix);
    const clientTemplate = await ClientTemplate.findById(req.params.id);

    if (!clientTemplate) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    if (clientTemplate.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this template",
      });
    }

    // Extract the timestamp suffix from existing slug to maintain uniqueness
    const currentSlug = clientTemplate.shareSlug;
    const suffix = currentSlug.split("-").pop();
    const newSlug = `${sanitizedPrefix}-${suffix}`;

    // Check if new slug is already taken by another user's template
    const existing = await ClientTemplate.findOne({
      shareSlug: newSlug,
      _id: { $ne: clientTemplate._id },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "This share link is already taken. Try a different prefix.",
      });
    }

    clientTemplate.shareSlug = newSlug;
    await clientTemplate.save();

    const shareUrl = `${process.env.FRONTEND_URL}/share/${newSlug}`;

    res.json({
      success: true,
      message: "Share link updated successfully",
      data: clientTemplate,
    });

    await sendEmail(
      req.user.email,
      "🎉 Your Invitation Link is Ready",
      `
  <div style="
    font-family:Arial,Helvetica,sans-serif;
    max-width:600px;
    margin:auto;
    padding:20px;
    background:#f7f7f7;
  ">
    <div style="
      background:#ffffff;
      border-radius:14px;
      overflow:hidden;
    ">

      <div style="
        background:#861E1D;
        padding:24px;
        text-align:center;
      ">
        <h2 style="
          margin:0;
          color:#ffffff;
        ">
          InviteArc
        </h2>

        <p style="
          margin:6px 0 0;
          color:#f8dddd;
          font-size:13px;
        ">
          Beautiful Digital Invitations
        </p>
      </div>

      <div style="padding:30px;">

        <p>Hello ${req.user.name || "there"},</p>

        <p style="
          color:#555;
          line-height:1.6;
        ">
          Your invitation link has been generated successfully.
          You can now share it with your family and friends.
        </p>

        <div style="
          background:#fdf7f6;
          border:1px solid #ead8d7;
          border-radius:10px;
          padding:16px;
          margin:20px 0;
        ">
          <p style="
            margin:0 0 8px;
            font-size:11px;
            font-weight:bold;
            color:#777;
            text-transform:uppercase;
          ">
            Your Invitation Link
          </p>

          <p style="
            margin:0;
            color:#861E1D;
            font-size:14px;
            word-break:break-all;
          ">
            ${shareUrl}
          </p>
        </div>

        <div style="
          text-align:center;
          margin:25px 0;
        ">
          <a
            href="${shareUrl}"
            style="
              background:#861E1D;
              color:#ffffff;
              padding:13px 24px;
              text-decoration:none;
              border-radius:7px;
              display:inline-block;
              font-size:14px;
              font-weight:bold;
            "
          >
            View Invitation
          </a>
        </div>

        <p style="
          color:#888;
          font-size:12px;
          text-align:center;
        ">
          You can copy the link above and share it directly with your guests.
        </p>

      </div>

      <div style="
        padding:18px;
        background:#fafafa;
        border-top:1px solid #eeeeee;
        text-align:center;
      ">
        <p style="
          margin:0;
          color:#888;
          font-size:12px;
        ">
          Thank you for choosing InviteArc ❤️
        </p>

        <p style="
          margin:6px 0 0;
          color:#aaa;
          font-size:11px;
        ">
          © ${new Date().getFullYear()} InviteArc
        </p>
      </div>

    </div>
  </div>
  `,
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//----- /api/client-templates/share -----
export const shareTemplate = async (req, res) => {
  try {
    const clientTemplate = await ClientTemplate.findOne({
      shareSlug: req.params.slug,
    }).populate("templateId");

    if (!clientTemplate) {
      return res.status(404).json({
        success: false,
        message: "shared template not found",
      });
    }

    res.json({
      success: true,
      message: "Template share successfully",
      data: clientTemplate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateClientTemplate = async (req, res) => {
  try {
    const { customData } = req.body;

    const updated = await ClientTemplate.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      {
        customData,
      },
      {
        new: true,
      },
    ).populate("templateId");

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("UPDATE ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
