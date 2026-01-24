const nodemailer = require('nodemailer');

// Enhanced nodemailer configuration for Render and cloud deployments
const createTransporter = () => {
  // Check if environment variables are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  EMAIL_USER or EMAIL_PASS not set. Email functionality will be disabled.');
    return null;
  }

  // Determine SMTP configuration
  // For Render and cloud platforms, use explicit SMTP config instead of service: "gmail"
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const useSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  // Use explicit SMTP configuration - works better on cloud platforms like Render
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: useSecure, // true for 465, false for other ports (587 uses STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Should be Gmail App Password, not regular password
    },
    tls: {
      // Do not fail on invalid certs (useful for some cloud environments)
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
      // Use modern TLS
      minVersion: 'TLSv1.2'
    },
    // Connection timeout settings for cloud environments
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
    // Retry configuration - disable pooling for better compatibility
    pool: false,
    // Debug mode (set to true to see SMTP traffic)
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development',
  });

  // Store original sendMail
  const originalSendMail = transporter.sendMail.bind(transporter);

  // Enhanced sendMail with better error handling and retry logic
  transporter.sendMail = async function(mailOptions) {
    const maxRetries = 2;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const finalOptions = {
          ...mailOptions,
          // Add default from if not provided
          from: mailOptions.from || process.env.EMAIL_USER,
        };

        const info = await originalSendMail(finalOptions);
        
        if (process.env.NODE_ENV !== 'production' || attempt > 1) {
          console.log('✅ Email sent successfully:', {
            to: finalOptions.to,
            subject: finalOptions.subject,
            messageId: info.messageId,
            attempt: attempt,
          });
        }
        
        return info;
      } catch (error) {
        lastError = error;
        
        // Log detailed error information
        const errorDetails = {
          error: error.message,
          code: error.code,
          command: error.command,
          response: error.response,
          to: mailOptions.to,
          subject: mailOptions.subject,
          attempt: attempt,
        };

        console.error(`❌ Email sending failed (attempt ${attempt}/${maxRetries}):`, errorDetails);
        
        // Provide helpful error messages
        if (error.code === 'EAUTH') {
          console.error('   🔐 Authentication failed. Check EMAIL_USER and EMAIL_PASS.');
          console.error('   📧 For Gmail: Use App Password, not regular password.');
          console.error('   🔗 Enable 2FA and generate App Password: https://myaccount.google.com/apppasswords');
          // Don't retry auth errors
          break;
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
          console.error('   ⏱️  Connection timeout. Check SMTP_HOST and SMTP_PORT settings.');
          console.error('   🌐 Render may have network restrictions. Try using port 587 with TLS.');
          // Wait before retry
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }
        } else if (error.code === 'EENVELOPE') {
          console.error('   📮 Invalid email address or envelope.');
          // Don't retry envelope errors
          break;
        } else {
          // Wait before retry for other errors
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }
        }
      }
    }

    // All retries failed
    throw lastError;
  };

  // Verify connection on startup (only in production to catch config issues early)
  if (process.env.NODE_ENV === 'production') {
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP Connection verification failed:', error.message);
        console.error('   Make sure EMAIL_USER and EMAIL_PASS are set correctly in Render environment variables');
        console.error('   For Gmail, use App Password (not regular password)');
        console.error('   Enable 2FA and generate App Password: https://myaccount.google.com/apppasswords');
        console.error('   Current SMTP config:', {
          host: smtpHost,
          port: smtpPort,
          secure: useSecure,
          user: process.env.EMAIL_USER,
        });
      } else {
        console.log('✅ SMTP server is ready to send emails');
        console.log('   SMTP config:', {
          host: smtpHost,
          port: smtpPort,
          secure: useSecure,
        });
      }
    });
  }

  return transporter;
};

const transporter = createTransporter();

// Export transporter (with enhanced sendMail method) or a no-op transporter
module.exports = transporter || {
  sendMail: async () => {
    console.warn('⚠️  Email service not configured. Email sending skipped.');
    return { messageId: 'skipped' };
  },
  verify: (callback) => {
    callback(new Error('Email service not configured'), false);
  },
};
