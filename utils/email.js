const nodemailer = require("nodemailer");

// Try to load Resend (for Render compatibility)
let Resend = null;
let resend = null;
try {
  Resend = require("resend").Resend;
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log("✅ Resend initialized (for Render)");
  }
} catch (e) {
  // Resend not installed, will use SMTP
}

// Simple email transporter - exactly like your reference code
// Uses environment variables for credentials (for local development only)
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
// Automatically uses Resend on Render, SMTP locally
const sendMail = async (mailOptions) => {
  // Use Resend if API key is set (works on Render)
  if (resend && process.env.RESEND_API_KEY) {
    try {
      // Determine 'from' email - Resend requires verified domain or onboarding@resend.dev
      // Priority: RESEND_FROM_EMAIL > EMAIL_FROM > default onboarding@resend.dev
      let fromEmail = process.env.RESEND_FROM_EMAIL || 
                     process.env.EMAIL_FROM;
      
      // If no RESEND_FROM_EMAIL is set, use default Resend domain (works immediately)
      if (!fromEmail) {
        fromEmail = "onboarding@resend.dev";
        console.log("ℹ️  Using default Resend domain (onboarding@resend.dev)");
      }
      
      // Format: "Display Name <email@domain.com>" or just "email@domain.com"
      const formattedFrom = fromEmail.includes("<") 
        ? fromEmail 
        : `Samjubaa Creation <${fromEmail}>`;

      console.log("📧 Sending email via Resend:", {
        from: formattedFrom,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });

      // Send email using Resend
      const result = await resend.emails.send({
        from: formattedFrom,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text || mailOptions.html?.replace(/<[^>]*>/g, ""), // Strip HTML for text
      });

      // Check if Resend returned an error
      if (result.error) {
        const errorMsg = result.error.message || JSON.stringify(result.error);
        console.error("❌ Resend API returned an error:", errorMsg);
        
        // Provide helpful error messages
        if (result.error.message?.includes("domain is not verified")) {
          console.error("💡 Solution: Verify your domain at https://resend.com/domains");
          console.error("💡 Or use onboarding@resend.dev for testing (only sends to your verified email)");
        }
        if (result.error.message?.includes("testing emails")) {
          console.error("💡 Solution: Verify a domain to send to any recipient");
          console.error("💡 Or send test emails only to your verified email address");
        }
        
        throw new Error(`Resend API error: ${errorMsg}`);
      }

      // Resend returns { data: { id: '...' } } on success
      const emailId = result.data?.id || result.id;

      if (emailId) {
        console.log("✅ Email sent successfully via Resend:", {
          to: mailOptions.to,
          subject: mailOptions.subject,
          emailId: emailId,
        });
      } else {
        console.log("✅ Email sent via Resend:", {
          to: mailOptions.to,
          subject: mailOptions.subject,
        });
      }

      return {
        messageId: emailId || "resend-sent",
        ...result,
      };
    } catch (error) {
      console.error("❌ Resend email failed:", {
        error: error.message,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });
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
