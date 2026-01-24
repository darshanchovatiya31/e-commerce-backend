const nodemailer = require('nodemailer');

// Try to use SendGrid if available (works on Render)
let sgMail = null;
try {
  sgMail = require('@sendgrid/mail');
} catch (e) {
  // SendGrid not installed, will use SMTP
}

// Email service configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'smtp'; // 'sendgrid' or 'smtp'

// Initialize SendGrid if configured
if (EMAIL_PROVIDER === 'sendgrid' && sgMail && process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid email service initialized (works on Render)');
}

// Create SMTP transporter (for local development or if SendGrid not available)
const createSMTPTransporter = () => {
  // Check if environment variables are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const useSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: useSecure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    pool: false,
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development',
  });

  return transporter;
};

const smtpTransporter = createSMTPTransporter();

// Enhanced sendMail function that works with both SendGrid and SMTP
const sendMail = async (mailOptions) => {
  // Use SendGrid API if configured (recommended for Render)
  if (EMAIL_PROVIDER === 'sendgrid' && sgMail && process.env.SENDGRID_API_KEY) {
    try {
      const msg = {
        to: mailOptions.to,
        from: mailOptions.from || process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || 'noreply@samjubaa.com',
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text || mailOptions.html?.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      };

      const response = await sgMail.send(msg);
      
      console.log('✅ Email sent via SendGrid:', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        statusCode: response[0]?.statusCode,
      });
      
      return {
        messageId: response[0]?.headers['x-message-id'] || 'sendgrid-sent',
        response: response[0],
      };
    } catch (error) {
      console.error('❌ SendGrid email sending failed:', {
        error: error.message,
        code: error.code,
        response: error.response?.body,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });
      
      if (error.response) {
        console.error('   SendGrid Error Details:', JSON.stringify(error.response.body, null, 2));
      }
      
      throw error;
    }
  }

  // Fallback to SMTP (for local development)
  if (!smtpTransporter) {
    const error = new Error('Email service not configured. Set SENDGRID_API_KEY for Render or EMAIL_USER/EMAIL_PASS for SMTP.');
    console.error('❌', error.message);
    throw error;
  }

  // Use SMTP with retry logic
  const maxRetries = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const finalOptions = {
        ...mailOptions,
        from: mailOptions.from || process.env.EMAIL_USER,
      };

      const info = await smtpTransporter.sendMail(finalOptions);
      
      if (process.env.NODE_ENV !== 'production' || attempt > 1) {
        console.log('✅ Email sent via SMTP:', {
          to: finalOptions.to,
          subject: finalOptions.subject,
          messageId: info.messageId,
          attempt: attempt,
        });
      }
      
      return info;
    } catch (error) {
      lastError = error;
      
      console.error(`❌ SMTP email sending failed (attempt ${attempt}/${maxRetries}):`, {
        error: error.message,
        code: error.code,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });
      
      if (error.code === 'EAUTH') {
        console.error('   🔐 Authentication failed. Check EMAIL_USER and EMAIL_PASS.');
        break;
      } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
        console.error('   ⏱️  Connection timeout. Render blocks SMTP connections.');
        console.error('   💡 Solution: Use SendGrid API instead. Set EMAIL_PROVIDER=sendgrid and SENDGRID_API_KEY');
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      } else if (error.code === 'EENVELOPE') {
        console.error('   📮 Invalid email address or envelope.');
        break;
      } else {
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }
  }

  throw lastError;
};

// Create transporter-like object for backward compatibility
const transporter = {
  sendMail: sendMail,
  verify: (callback) => {
    if (EMAIL_PROVIDER === 'sendgrid' && sgMail && process.env.SENDGRID_API_KEY) {
      // SendGrid doesn't need verification, just check API key
      if (process.env.SENDGRID_API_KEY) {
        callback(null, true);
      } else {
        callback(new Error('SENDGRID_API_KEY not set'), false);
      }
    } else if (smtpTransporter) {
      smtpTransporter.verify(callback);
    } else {
      callback(new Error('Email service not configured'), false);
    }
  },
};

// Verify connection on startup in production
if (process.env.NODE_ENV === 'production') {
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email service verification failed:', error.message);
      if (EMAIL_PROVIDER === 'sendgrid') {
        console.error('   Make sure SENDGRID_API_KEY is set in Render environment variables');
        console.error('   Get your API key from: https://app.sendgrid.com/settings/api_keys');
      } else {
        console.error('   Render blocks SMTP connections. Use SendGrid instead:');
        console.error('   1. Set EMAIL_PROVIDER=sendgrid');
        console.error('   2. Set SENDGRID_API_KEY=your-api-key');
        console.error('   3. Set SENDGRID_FROM_EMAIL=your-verified-email@domain.com');
      }
    } else {
      console.log('✅ Email service is ready');
      console.log('   Provider:', EMAIL_PROVIDER === 'sendgrid' ? 'SendGrid API' : 'SMTP');
    }
  });
}

module.exports = transporter;
