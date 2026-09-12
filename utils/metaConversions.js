import crypto from "crypto";

const hashData = (value) => {
  if (!value) return null;

  return crypto
    .createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
};

export const sendMetaPurchaseEvent = async ({
  user,
  order,
  payment,
}) => {
  try {
    const pixelId = process.env.META_PIXEL_ID;
    const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

    if (!pixelId || !accessToken) {
      console.error("Meta CAPI credentials are missing");
      return false;
    }

    const eventId = payment.id;

    const userData = {
      em: [hashData(user.email)],
      ph: [hashData(user.mobileNumber)],
    };

    const payload = {
      data: [
        {
          event_name: "Purchase",

          event_time: Math.floor(Date.now() / 1000),

          event_id: eventId,

          action_source: "website",

          user_data: userData,

          custom_data: {
            currency: order.currency,
            value: order.amount / 100,
            order_id: order.razorpayOrderId,
          },
        },
      ],

    };

    const response = await fetch(
      `https://graph.facebook.com/v25.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Meta CAPI error:", result);
      return false;
    }

    console.log(
      "Meta Purchase event sent successfully:",
      result
    );

    return true;
  } catch (error) {
    console.error(
      "Meta CAPI request error:",
      error
    );

    return false;
  }
};