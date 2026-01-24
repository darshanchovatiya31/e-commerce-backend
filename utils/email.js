const nodemailer = require("nodemailer");

// Try to load SendGrid (for Render compatibility)
let sgMail = null;
try {
  sgMail = require("@sendgrid/mail");
} catch (e) {
  // SendGrid not installed, will use SMTP
}

// Initialize SendGrid if API key is provided (for Render)
if (sgMail && process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log("✅ SendGrid initialized (for Render)");
}

// Simple email transporter - exactly like your reference code
// Uses environment variables for credentials
const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: true,
  port: 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Simple sendMail function - works exactly like your reference code
// Automatically uses SendGrid on Render, SMTP locally
const sendMail = async (mailOptions) => {
  // Use SendGrid if API key is set (works on Render)
  if (sgMail && process.env.SENDGRID_API_KEY) {
    try {
      const msg = {
        to: mailOptions.to,
        from: mailOptions.from || process.env.EMAIL_USER || process.env.SENDGRID_FROM_EMAIL,
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
      };

      await sgMail.send(msg);
      console.log("✅ Email sent via SendGrid:", {
        to: mailOptions.to,
        subject: mailOptions.subject,
      });
      return { messageId: "sendgrid-sent" };
    } catch (error) {
      console.error("❌ SendGrid email failed:", error.message);
      throw error;
    }
  }

  // Fallback to Gmail SMTP (for local development)
  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER || mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      text: mailOptions.text,
      html: mailOptions.html,
    });
    
    console.log("✅ Email sent via Gmail SMTP:", {
      to: mailOptions.to,
      subject: mailOptions.subject,
    });
    
    return result;
  } catch (error) {
    console.error("❌ Email sending failed:", {
      error: error.message,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });
    throw error;
  }
};

// Export as transporter object (backward compatible with existing code)
// This way you can use: transporter.sendMail({...}) everywhere
module.exports = {
  sendMail: sendMail,
};
