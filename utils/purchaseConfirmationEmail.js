import sendEmail from "../config/sendEmail.js";

const sendPurchaseConfirmationEmails = async ({
  order,
  template,
  user,
  payment,
}) => {
  const amount = `${(payment.amount / 100).toFixed(2)} ${payment.currency}`;
  const serviceLabel =
    order.serviceType === "team-edit"
      ? "Team Edit"
      : order.serviceType === "self-edit"
        ? "Self Edit"
        : order.serviceType || "Template";

  const details = `
    <div style="
      margin-top: 24px;
      border: 1px solid #ead8d7;
      border-radius: 12px;
      overflow: hidden;
      background: #ffffff;
    ">
      <div style="
        background: #fdf6f5;
        padding: 14px 18px;
        border-bottom: 1px solid #ead8d7;
      ">
        <h3 style="
          margin: 0;
          color: #861E1D;
          font-size: 16px;
          font-family: Arial, sans-serif;
        ">
          Purchase Details
        </h3>
      </div>

      <div style="padding: 18px;">
        <table style="
          width: 100%;
          border-collapse: collapse;
          font-family: Arial, sans-serif;
          font-size: 14px;
        ">
          <tr>
            <td style="padding: 8px 0; color: #666;">
              Template
            </td>
            <td style="
              padding: 8px 0;
              text-align: right;
              font-weight: 600;
              color: #222;
            ">
              ${template.title}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px 0; color: #666;">
              Amount
            </td>
            <td style="
              padding: 8px 0;
              text-align: right;
              font-weight: 600;
              color: #861E1D;
            ">
              ${amount}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px 0; color: #666;">
              Service
            </td>
            <td style="
              padding: 8px 0;
              text-align: right;
              font-weight: 600;
              color: #222;
            ">
              ${serviceLabel}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px 0; color: #666;">
              Order ID
            </td>
            <td style="
              padding: 8px 0;
              text-align: right;
              color: #555;
              word-break: break-all;
            ">
              ${order.razorpayOrderId}
            </td>
          </tr>

          <tr>
            <td style="padding: 8px 0; color: #666;">
              Payment ID
            </td>
            <td style="
              padding: 8px 0;
              text-align: right;
              color: #555;
              word-break: break-all;
            ">
              ${payment.id}
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;

  const emailJobs = [];

  // ==========================================
  // CUSTOMER CONFIRMATION EMAIL
  // ==========================================
  if (!order.userConfirmationSent && user?.email) {
    emailJobs.push(
      sendEmail(
        user.email,
        "Your InviteArc template purchase is confirmed",
        `
          <div style="
            margin: 0;
            padding: 40px 20px;
            background: #f7f7f7;
            font-family: Arial, Helvetica, sans-serif;
          ">

            <div style="
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 18px rgba(0,0,0,0.06);
            ">

              <!-- HEADER -->
              <div style="
                background: #861E1D;
                padding: 25px 20px;
                text-align: center;
              ">
                <h1 style="
                  margin: 0;
                  color: #ffffff;
                  font-size: 26px;
                  font-weight: 700;
                ">
                  InviteArc
                </h1>

                <p style="
                  margin: 8px 0 0;
                  color: #f8dddd;
                  font-size: 13px;
                ">
                  Beautiful Digital Invitations
                </p>
              </div>

              <!-- CONTENT -->
              <div style="padding: 32px 28px;">

                <!-- SUCCESS ICON -->
                <div style="
                  text-align: center;
                  margin-bottom: 20px;
                ">
                  <div style="
                    display: inline-block;
                    width: 54px;
                    height: 54px;
                    line-height: 54px;
                    border-radius: 50%;
                    background: #f3e3e2;
                    color: #861E1D;
                    font-size: 28px;
                    font-weight: bold;
                  ">
                    ✓
                  </div>
                </div>

                <h2 style="
                  margin: 0 0 12px;
                  text-align: center;
                  color: #222;
                  font-size: 22px;
                  font-weight: 700;
                ">
                  Purchase Confirmed!
                </h2>

                <p style="
                  color: #555;
                  font-size: 15px;
                  line-height: 1.7;
                  margin: 20px 0 8px;
                ">
                  Hello ${user.name || "there"},
                </p>

                <p style="
                  color: #555;
                  font-size: 15px;
                  line-height: 1.7;
                  margin: 0;
                ">
                  Thank you for your purchase! Your InviteArc template
                  purchase was successful and your editable invitation
                  is now available in your dashboard.
                </p>

                ${details}

                <!-- DASHBOARD BUTTON -->
                <div style="
                  text-align: center;
                  margin-top: 28px;
                ">
                  <a
                    href="${
                      process.env.FRONTEND_URL || "https://invitearc.com"
                    }/dashboard"
                    style="
                      display: inline-block;
                      background: #861E1D;
                      color: #ffffff;
                      text-decoration: none;
                      padding: 13px 28px;
                      border-radius: 8px;
                      font-size: 14px;
                      font-weight: 600;
                    "
                  >
                    Go to My Dashboard
                  </a>
                </div>

                <p style="
                  margin: 26px 0 0;
                  color: #777;
                  font-size: 13px;
                  line-height: 1.6;
                  text-align: center;
                ">
                  You can now open your template, customize your invitation,
                  and publish it from your dashboard.
                </p>

              </div>

              <!-- FOOTER -->
              <div style="
                padding: 18px 24px;
                background: #fafafa;
                border-top: 1px solid #eee;
                text-align: center;
              ">
                <p style="
                  margin: 0;
                  color: #888;
                  font-size: 12px;
                ">
                  © ${new Date().getFullYear()} InviteArc. All rights reserved.
                </p>
              </div>

            </div>
          </div>
        `,
      ),
    );
  }

  // ==========================================
  // ADMIN NOTIFICATION EMAIL
  // ==========================================
  if (!order.adminConfirmationSent && process.env.ADMIN_EMAIL) {
    emailJobs.push(
      sendEmail(
        process.env.ADMIN_EMAIL,
        `New InviteArc template purchase: ${template.title}`,
        `
          <div style="
            margin: 0;
            padding: 40px 20px;
            background: #f7f7f7;
            font-family: Arial, Helvetica, sans-serif;
          ">

            <div style="
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 18px rgba(0,0,0,0.06);
            ">

              <!-- HEADER -->
              <div style="
                background: #861E1D;
                padding: 25px 24px;
              ">
                <h1 style="
                  margin: 0;
                  color: #ffffff;
                  font-size: 24px;
                  font-weight: 700;
                ">
                  InviteArc Admin
                </h1>

                <p style="
                  margin: 7px 0 0;
                  color: #f8dddd;
                  font-size: 13px;
                ">
                  New template purchase received
                </p>
              </div>

              <!-- CONTENT -->
              <div style="padding: 30px 28px;">

                <!-- PAYMENT SUCCESS -->
                <div style="
                  background: #eef8f0;
                  border: 1px solid #cfe8d3;
                  border-radius: 10px;
                  padding: 14px 16px;
                  margin-bottom: 24px;
                ">
                  <p style="
                    margin: 0;
                    color: #287a36;
                    font-size: 14px;
                    font-weight: 600;
                  ">
                    ✓ Payment Successful
                  </p>
                </div>

                <h2 style="
                  margin: 0 0 18px;
                  color: #222;
                  font-size: 20px;
                ">
                  New Customer Purchase
                </h2>

                <!-- CUSTOMER DETAILS -->
                <div style="
                  background: #fafafa;
                  border: 1px solid #eeeeee;
                  border-radius: 10px;
                  padding: 16px;
                  margin-bottom: 22px;
                ">

                  <p style="
                    margin: 0 0 8px;
                    font-size: 14px;
                    color: #555;
                  ">
                    <strong style="color:#222;">
                      Customer:
                    </strong>
                    ${user?.name || "Unknown"}
                  </p>

                  <p style="
                    margin: 0;
                    font-size: 14px;
                    color: #555;
                  ">
                    <strong style="color:#222;">
                      Email:
                    </strong>
                    ${user?.email || "Unknown"}
                  </p>

                </div>

                ${details}

                <p style="
                  margin-top: 26px;
                  color: #777;
                  font-size: 13px;
                  line-height: 1.6;
                ">
                  This notification was generated automatically after
                  successful payment confirmation.
                </p>

              </div>

              <!-- FOOTER -->
              <div style="
                padding: 18px 24px;
                background: #fafafa;
                border-top: 1px solid #eee;
                text-align: center;
              ">
                <p style="
                  margin: 0;
                  color: #888;
                  font-size: 12px;
                ">
                  InviteArc Admin Notification
                </p>
              </div>

            </div>
          </div>
        `,
      ),
    );
  }

  // ==========================================
  // SEND EMAILS
  // ==========================================
  const results = await Promise.allSettled(emailJobs);

  const hasUserEmail = Boolean(user?.email);
  const hasAdminEmail = Boolean(process.env.ADMIN_EMAIL);

  let resultIndex = 0;

  // CUSTOMER EMAIL RESULT
  if (hasUserEmail && !order.userConfirmationSent) {
    if (results[resultIndex]?.status === "fulfilled") {
      order.userConfirmationSent = true;
    } else {
      console.error(
        "Customer purchase confirmation email failed:",
        results[resultIndex]?.reason,
      );
    }

    resultIndex += 1;
  }

  // ADMIN EMAIL RESULT
  if (hasAdminEmail && !order.adminConfirmationSent) {
    if (results[resultIndex]?.status === "fulfilled") {
      order.adminConfirmationSent = true;
    } else {
      console.error(
        "Admin purchase notification email failed:",
        results[resultIndex]?.reason,
      );
    }
  }

  await order.save();
};

export default sendPurchaseConfirmationEmails;

