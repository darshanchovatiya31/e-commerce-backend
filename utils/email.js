const nodemailer = require('nodemailer');

/**
 * Create email transporter based on configured provider
 * Supports: SendGrid, Mailgun, AWS SES, Postmark, Resend, and SMTP fallback
 */
const createTransporter = () => {
  const emailProvider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
  
  // SendGrid API
  if (emailProvider === 'sendgrid') {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('⚠️  SendGrid API key not configured. Email functionality will be disabled.');
      return null;
    }
    
    // SendGrid via nodemailer (using SMTP API)
    return nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }

  // Mailgun API
  if (emailProvider === 'mailgun') {
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
      console.warn('⚠️  Mailgun credentials not configured. Email functionality will be disabled.');
      return null;
    }
    
    // Mailgun via nodemailer (using SMTP API)
    return nodemailer.createTransport({
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAILGUN_SMTP_USER || `postmaster@${process.env.MAILGUN_DOMAIN}`,
        pass: process.env.MAILGUN_API_KEY
      }
    });
  }

  // AWS SES
  if (emailProvider === 'ses' || emailProvider === 'aws') {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn('⚠️  AWS SES credentials not configured. Email functionality will be disabled.');
      return null;
    }
    
    // AWS SES via nodemailer
    return nodemailer.createTransport({
      SES: {
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      }
    });
  }

  // Postmark
  if (emailProvider === 'postmark') {
    if (!process.env.POSTMARK_API_TOKEN) {
      console.warn('⚠️  Postmark API token not configured. Email functionality will be disabled.');
      return null;
    }
    
    // Postmark via nodemailer (using SMTP API)
    return nodemailer.createTransport({
      host: 'smtp.postmarkapp.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.POSTMARK_API_TOKEN,
        pass: process.env.POSTMARK_API_TOKEN
      }
    });
  }

  // Resend
  if (emailProvider === 'resend') {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️  Resend API key not configured. Email functionality will be disabled.');
      return null;
    }
    
    // Resend via nodemailer (using SMTP API)
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY
      }
    });
  }

  // SMTP (fallback/default)
  if (emailProvider === 'smtp' || !emailProvider) {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️  Email credentials not configured. Email functionality will be disabled.');
      return null;
    }

    const config = {
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    };

    // For custom SMTP servers
    if (process.env.EMAIL_HOST) {
      config.host = process.env.EMAIL_HOST;
      config.port = parseInt(process.env.EMAIL_PORT || '587');
      config.secure = process.env.EMAIL_SECURE === 'true';
    }

    return nodemailer.createTransport(config);
  }

  console.warn(`⚠️  Unknown email provider: ${emailProvider}. Email functionality will be disabled.`);
  return null;
};

const transporter = createTransporter();

// Verify transporter connection (non-blocking, async - doesn't block server startup)
if (transporter) {
  // Run verification asynchronously without blocking
  setImmediate(() => {
    const verifyTimeout = setTimeout(() => {
      console.warn('⚠️  Email transporter verification timed out. Email functionality may be limited.');
    }, 10000);

    transporter.verify((error, success) => {
      clearTimeout(verifyTimeout);
      if (error) {
        console.error('❌ Email transporter verification failed:', error.message);
        console.warn('⚠️  Email sending may fail, but registration and other features will still work.');
      } else {
        console.log('✅ Email transporter is ready to send messages');
      }
    });
  });
} else {
  console.warn('⚠️  Email transporter not initialized. Email functionality will be disabled.');
}

// Base email template wrapper
const getBaseTemplate = (content, title) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #8B0000; margin-bottom: 30px;">
          <h1 style="color: #8B0000; margin: 0; font-size: 28px;">Samjubaa Creation</h1>
          <p style="color: #2dd4bf; margin: 5px 0 0 0; font-style: italic;">Timeless Elegance</p>
        </div>
        
        <!-- Content -->
        ${content}
        
        <!-- Footer -->
        <div style="text-align: center; padding: 30px 0; border-top: 1px solid #e5e7eb; margin-top: 40px; color: #9ca3af; font-size: 12px;">
          <p style="margin: 5px 0;">© ${new Date().getFullYear()} Samjubaa Creation. All rights reserved.</p>
          <p style="margin: 5px 0;">This is an automated email. Please do not reply to this message.</p>
          <div style="margin-top: 15px;">
            <a href="mailto:support@samjubaa.com" style="color: #2dd4bf; text-decoration: none; margin: 0 10px;">📧 support@samjubaa.com</a>
            <a href="tel:+919023040062" style="color: #2dd4bf; text-decoration: none; margin: 0 10px;">📞 +91-98765-43210</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Email Templates
const emailTemplates = {
  // Welcome Email
  welcome: (data) => {
    const { firstName, lastName, email } = data;
    const content = `
      <div style="text-align: center; padding: 30px 0;">
        <div style="background: linear-gradient(135deg, #8B0000, #2dd4bf); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px;">🎉 Welcome to Samjubaa Creation!</h2>
        </div>
        <p style="font-size: 16px; color: #333;">Dear ${firstName} ${lastName},</p>
        <p style="color: #6b7280;">Thank you for joining Samjubaa Creation! We're thrilled to have you as part of our community.</p>
        <p style="color: #6b7280;">Your account has been successfully created. You can now:</p>
        <ul style="text-align: left; color: #6b7280; max-width: 400px; margin: 20px auto;">
          <li>Browse our exclusive collection</li>
          <li>Save your favorite items to wishlist</li>
          <li>Track your orders easily</li>
          <li>Enjoy special member-only offers</li>
        </ul>
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://samjubaa.com'}/shop" 
             style="background-color: #8B0000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Start Shopping
          </a>
        </div>
      </div>
    `;
    return {
      subject: 'Welcome to Samjubaa Creation!',
      html: getBaseTemplate(content, 'Welcome'),
      text: `Welcome to Samjubaa Creation!\n\nDear ${firstName} ${lastName},\n\nThank you for joining Samjubaa Creation! We're thrilled to have you as part of our community.\n\nYour account has been successfully created. Start shopping now at ${process.env.FRONTEND_URL || 'https://samjubaa.com'}/shop`
    };
  },

  // Password Reset OTP Email
  passwordResetOTP: (data) => {
    const { firstName, otp } = data;
    const content = `
      <div style="text-align: center; padding: 30px 0;">
        <div style="background: linear-gradient(135deg, #8B0000, #2dd4bf); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px;">🔐 Password Reset OTP</h2>
        </div>
        <p style="font-size: 16px; color: #333;">Dear ${firstName},</p>
        <p style="color: #6b7280;">We received a request to reset your password. Use the OTP below to verify your identity:</p>
        <div style="margin: 30px 0;">
          <div style="background: linear-gradient(135deg, #fef3c7, #fed7aa); padding: 25px; border-radius: 12px; border: 3px solid #8B0000;">
            <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600; margin-bottom: 10px;">Your One-Time Password (OTP)</p>
            <p style="margin: 0; color: #8B0000; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
          </div>
        </div>
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ This OTP will expire in 10 minutes for security reasons.</p>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 10px;">For security reasons, never share this OTP with anyone.</p>
      </div>
    `;
    return {
      subject: 'Password Reset OTP - Samjubaa Creation',
      html: getBaseTemplate(content, 'Password Reset OTP'),
      text: `Password Reset OTP\n\nDear ${firstName},\n\nWe received a request to reset your password. Use the OTP below to verify your identity:\n\nOTP: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email. For security reasons, never share this OTP with anyone.`
    };
  },

  // Password Reset Email (Legacy - kept for backward compatibility)
  passwordReset: (data) => {
    const { firstName, resetToken } = data;
    const resetUrl = `${process.env.FRONTEND_URL || 'https://samjubaa.com'}/reset-password/${resetToken}`;
    const content = `
      <div style="text-align: center; padding: 30px 0;">
        <div style="background: linear-gradient(135deg, #8B0000, #2dd4bf); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px;">🔐 Password Reset Request</h2>
        </div>
        <p style="font-size: 16px; color: #333;">Dear ${firstName},</p>
        <p style="color: #6b7280;">We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #8B0000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Reset Password
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="color: #2dd4bf; font-size: 12px; word-break: break-all;">${resetUrl}</p>
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ This link will expire in 15 minutes for security reasons.</p>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
      </div>
    `;
    return {
      subject: 'Password Reset Request - Samjubaa Creation',
      html: getBaseTemplate(content, 'Password Reset'),
      text: `Password Reset Request\n\nDear ${firstName},\n\nWe received a request to reset your password. Click the link below to create a new password:\n\n${resetUrl}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.`
    };
  },

  // Order Confirmation Email
  orderConfirmation: (data) => {
    const { orderId, customerName, customerEmail, items, total, shippingAddress, estimatedDelivery } = data;
    const itemsHtml = items.map(item => `
      <div style="display: flex; align-items: center; padding: 16px; border-bottom: 1px solid #e5e7eb;">
        <img src="${item.image || '/placeholder.svg'}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 16px;">
        <div style="flex: 1;">
          <h4 style="margin: 0; color: #8B0000; font-size: 14px;">${item.name}</h4>
          <p style="margin: 4px 0; color: #6b7280; font-size: 12px;">Quantity: ${item.quantity}</p>
          ${item.selectedSize ? `<p style="margin: 4px 0; color: #6b7280; font-size: 12px;">Size: ${item.selectedSize}</p>` : ''}
          ${item.selectedColor ? `<p style="margin: 4px 0; color: #6b7280; font-size: 12px;">Color: ${item.selectedColor}</p>` : ''}
        </div>
        <div style="color: #8B0000; font-weight: 600;">₹${(item.price * item.quantity).toLocaleString()}</div>
      </div>
    `).join('');

    const content = `
      <div style="text-align: center; padding: 30px 0;">
        <div style="background: linear-gradient(135deg, #8B0000, #2dd4bf); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px;">🎉 Order Confirmed!</h2>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Thank you for your purchase, ${customerName}!</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #8B0000; margin: 0 0 10px 0;">Order Details</h3>
          <p style="margin: 5px 0; font-size: 16px;"><strong>Order Number:</strong> ${orderId}</p>
          <p style="margin: 5px 0; color: #6b7280;">Estimated Delivery: ${new Date(estimatedDelivery).toLocaleDateString()}</p>
        </div>
      </div>
      <div style="margin: 30px 0;">
        <h3 style="color: #8B0000; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #f3f4f6;">Your Order</h3>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          ${itemsHtml}
          <div style="padding: 20px; background: #f9fafb; text-align: right;">
            <h4 style="margin: 0; color: #8B0000; font-size: 18px;">Total: ₹${total.toLocaleString()}</h4>
          </div>
        </div>
      </div>
      <div style="margin: 30px 0;">
        <h3 style="color: #8B0000; margin-bottom: 15px;">Shipping Address</h3>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2dd4bf;">
          <p style="margin: 0; line-height: 1.8;">
            ${shippingAddress.fullName || shippingAddress.name}<br>
            ${shippingAddress.address}<br>
            ${shippingAddress.city}, ${shippingAddress.state}<br>
            ${shippingAddress.pincode}
          </p>
        </div>
      </div>
      <div style="margin: 30px 0; padding: 25px; background: linear-gradient(135deg, #fef3c7, #fed7aa); border-radius: 12px;">
        <h3 style="color: #8B0000; margin: 0 0 15px 0;">What happens next?</h3>
        <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
          <li style="margin-bottom: 8px;">We'll prepare your order with care</li>
          <li style="margin-bottom: 8px;">You'll receive shipping confirmation with delivery details</li>
          <li style="margin-bottom: 8px;">Your order will be delivered by ${new Date(estimatedDelivery).toLocaleDateString()}</li>
        </ul>
      </div>
    `;
    return {
      subject: `Order Confirmation - ${orderId} | Samjubaa Creation`,
      html: getBaseTemplate(content, 'Order Confirmation'),
      text: `Order Confirmation - ${orderId}\n\nThank you for your purchase, ${customerName}!\n\nYour order has been confirmed and will be delivered by ${new Date(estimatedDelivery).toLocaleDateString()}.\n\nOrder Total: ₹${total.toLocaleString()}`
    };
  },

  // Order Status Update Email
  orderStatusUpdate: (data) => {
    const { orderId, customerName, status, trackingNumber, notes } = data;
    const statusMessages = {
      confirmed: 'Your order has been confirmed and is being prepared.',
      processing: 'Your order is being processed.',
      shipped: `Your order has been shipped${trackingNumber ? ` with tracking number: ${trackingNumber}` : ''}.`,
      delivered: 'Your order has been delivered successfully!',
      cancelled: 'Your order has been cancelled.'
    };
    const statusColors = {
      confirmed: '#2dd4bf',
      processing: '#3b82f6',
      shipped: '#8b5cf6',
      delivered: '#10b981',
      cancelled: '#ef4444'
    };
    const content = `
      <div style="text-align: center; padding: 30px 0;">
        <div style="background: linear-gradient(135deg, ${statusColors[status] || '#8B0000'}, #2dd4bf); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px;">📦 Order Status Update</h2>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Order ${orderId}</p>
        </div>
        <p style="font-size: 16px; color: #333;">Dear ${customerName},</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 5px 0; font-size: 16px;"><strong>Status:</strong> <span style="color: ${statusColors[status] || '#8B0000'}; font-weight: 600; text-transform: uppercase;">${status}</span></p>
          <p style="margin: 10px 0; color: #6b7280;">${statusMessages[status] || 'Your order status has been updated.'}</p>
          ${trackingNumber ? `<p style="margin: 10px 0;"><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
          ${notes ? `<p style="margin: 10px 0; color: #6b7280;"><strong>Notes:</strong> ${notes}</p>` : ''}
        </div>
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://samjubaa.com'}/orders/${orderId}" 
             style="background-color: #8B0000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            View Order Details
          </a>
        </div>
      </div>
    `;
    return {
      subject: `Order ${orderId} - Status Update | Samjubaa Creation`,
      html: getBaseTemplate(content, 'Order Status Update'),
      text: `Order Status Update\n\nDear ${customerName},\n\nYour order ${orderId} status has been updated to: ${status.toUpperCase()}\n\n${statusMessages[status] || 'Your order status has been updated.'}${trackingNumber ? `\n\nTracking Number: ${trackingNumber}` : ''}${notes ? `\n\nNotes: ${notes}` : ''}`
    };
  },

  // Order Cancellation Email
  orderCancellation: (data) => {
    const { orderId, customerName, reason } = data;
    const content = `
      <div style="text-align: center; padding: 30px 0;">
        <div style="background: linear-gradient(135deg, #ef4444, #8B0000); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px;">❌ Order Cancelled</h2>
        </div>
        <p style="font-size: 16px; color: #333;">Dear ${customerName},</p>
        <p style="color: #6b7280;">Your order <strong>${orderId}</strong> has been cancelled successfully.</p>
        ${reason ? `<div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0; color: #6b7280;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">💰 If payment was made, refund will be processed within 5-7 business days.</p>
        </div>
      </div>
    `;
    return {
      subject: `Order ${orderId} - Cancelled | Samjubaa Creation`,
      html: getBaseTemplate(content, 'Order Cancelled'),
      text: `Order Cancelled\n\nDear ${customerName},\n\nYour order ${orderId} has been cancelled successfully.${reason ? `\n\nReason: ${reason}` : ''}\n\nIf payment was made, refund will be processed within 5-7 business days.`
    };
  },

  // Payment Confirmation Email
  paymentConfirmation: (data) => {
    const { orderId, customerName, amount, paymentMethod } = data;
    const content = `
      <div style="text-align: center; padding: 30px 0;">
        <div style="background: linear-gradient(135deg, #10b981, #2dd4bf); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px;">✅ Payment Confirmed</h2>
        </div>
        <p style="font-size: 16px; color: #333;">Dear ${customerName},</p>
        <p style="color: #6b7280;">Your payment for order <strong>${orderId}</strong> has been confirmed!</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₹${amount.toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p style="margin: 5px 0;"><strong>Order Number:</strong> ${orderId}</p>
        </div>
        <p style="color: #6b7280;">Your order is now being processed and you'll receive updates via email.</p>
      </div>
    `;
    return {
      subject: `Payment Confirmed - Order ${orderId} | Samjubaa Creation`,
      html: getBaseTemplate(content, 'Payment Confirmed'),
      text: `Payment Confirmed\n\nDear ${customerName},\n\nYour payment for order ${orderId} has been confirmed!\n\nAmount Paid: ₹${amount.toLocaleString()}\nPayment Method: ${paymentMethod}`
    };
  },

  // Contact Form Notification (to Admin)
  contactNotification: (data) => {
    const { name, email, phone, subject, message } = data;
    const content = `
      <div style="padding: 30px 0;">
        <h2 style="color: #8B0000; margin-bottom: 20px;">New Contact Form Submission</h2>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #2dd4bf;">${email}</a></p>
          ${phone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> <a href="tel:${phone}" style="color: #2dd4bf;">${phone}</a></p>` : ''}
          <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
          <h3 style="color: #8B0000; margin-top: 0;">Message:</h3>
          <p style="color: #6b7280; white-space: pre-wrap;">${message}</p>
        </div>
        <div style="margin-top: 20px;">
          <a href="mailto:${email}" 
             style="background-color: #8B0000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Reply to ${name}
          </a>
        </div>
      </div>
    `;
    return {
      subject: `New Contact Form: ${subject} | Samjubaa Creation`,
      html: getBaseTemplate(content, 'Contact Form Submission'),
      text: `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ''}\nSubject: ${subject}\n\nMessage:\n${message}`
    };
  },

  // Contact Form Confirmation (to User)
  contactConfirmation: (data) => {
    const { name, subject } = data;
    const content = `
      <div style="text-align: center; padding: 30px 0;">
        <div style="background: linear-gradient(135deg, #8B0000, #2dd4bf); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px;">📧 Message Received</h2>
        </div>
        <p style="font-size: 16px; color: #333;">Dear ${name},</p>
        <p style="color: #6b7280;">Thank you for contacting Samjubaa Creation!</p>
        <p style="color: #6b7280;">We have received your message regarding "<strong>${subject}</strong>" and our team will get back to you within 24-48 hours.</p>
        <p style="color: #6b7280;">We appreciate your patience and look forward to assisting you.</p>
      </div>
    `;
    return {
      subject: `We Received Your Message - ${subject} | Samjubaa Creation`,
      html: getBaseTemplate(content, 'Message Received'),
      text: `Message Received\n\nDear ${name},\n\nThank you for contacting Samjubaa Creation!\n\nWe have received your message regarding "${subject}" and our team will get back to you within 24-48 hours.`
    };
  }
};

// Main send email function
exports.sendEmail = async ({ to, subject, text, html, attachments, cc, bcc }) => {
  if (!transporter) {
    console.warn('⚠️  Email transporter not available. Email not sent to:', to);
    return { success: false, error: 'Email service not configured' };
  }

  if (!to) {
    throw new Error('Recipient email address is required');
  }

  // Get sender email based on provider
  const getSenderEmail = () => {
    const emailProvider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
    
    if (emailProvider === 'sendgrid' && process.env.SENDGRID_FROM_EMAIL) {
      return process.env.SENDGRID_FROM_EMAIL;
    }
    if (emailProvider === 'mailgun' && process.env.MAILGUN_FROM_EMAIL) {
      return process.env.MAILGUN_FROM_EMAIL;
    }
    if (emailProvider === 'ses' || emailProvider === 'aws') {
      return process.env.AWS_SES_FROM_EMAIL || process.env.EMAIL_USER;
    }
    if (emailProvider === 'postmark' && process.env.POSTMARK_FROM_EMAIL) {
      return process.env.POSTMARK_FROM_EMAIL;
    }
    if (emailProvider === 'resend' && process.env.RESEND_FROM_EMAIL) {
      return process.env.RESEND_FROM_EMAIL;
    }
    
    // Default to EMAIL_USER for SMTP
    return process.env.EMAIL_USER || 'noreply@samjubaa.com';
  };

  const mailOptions = {
    from: `"Samjubaa Creation" <${getSenderEmail()}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject: subject || 'Notification from Samjubaa Creation',
    text: text || '',
    html: html || text || '',
    attachments: attachments || [],
    ...(cc && { cc: Array.isArray(cc) ? cc.join(', ') : cc }),
    ...(bcc && { bcc: Array.isArray(bcc) ? bcc.join(', ') : bcc })
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      messageId: info.messageId
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      error: error.message
    });
    throw error;
  }
};

// Template-based email sending
exports.sendTemplateEmail = async (templateName, data, options = {}) => {
  const template = emailTemplates[templateName];
  if (!template) {
    throw new Error(`Email template "${templateName}" not found`);
  }

  const templateData = template(data);
  const { to, cc, bcc, attachments } = options;

  return await exports.sendEmail({
    to: to || data.email || data.customerEmail,
    subject: templateData.subject,
    html: templateData.html,
    text: templateData.text,
    attachments,
    cc,
    bcc
  });
};

// Export templates for direct use if needed
exports.emailTemplates = emailTemplates;
