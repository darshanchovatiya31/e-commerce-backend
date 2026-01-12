const { body, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const responseHelper = require('../utils/responseHelper');
const transporter = require('../utils/email');

exports.validateCreate = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('subject').trim().isLength({ min: 2, max: 150 }),
  body('message').trim().isLength({ min: 5, max: 2000 }),
];

exports.create = [
  ...exports.validateCreate,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { name, email, phone, subject, message } = req.body;
      const doc = await Contact.create({
        name,
        email,
        phone,
        subject,
        message,
        user: req.user?._id,
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      // Send confirmation email to user - Same as Blog Haven
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: `We Received Your Message - ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h1 style="color: #8B0000;">Message Received</h1>
              <p>Dear ${name},</p>
              <p>Thank you for contacting Samjubaa Creation!</p>
              <p>We have received your message regarding "<strong>${subject}</strong>" and our team will get back to you within 24-48 hours.</p>
              <p>We appreciate your patience and look forward to assisting you.</p>
              
              <h3 style="color: #8B0000;">Best regards,</h3>
              <p>The Samjubaa Creation Team</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send contact confirmation email:', emailError);
        // Don't fail the contact creation if email fails
      }

      // Send notification email to admin - Same as Blog Haven
      try {
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: adminEmail,
          subject: `New Contact Form: ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h2 style="color: #8B0000;">New Contact Form Submission</h2>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                ${phone ? `<p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>` : ''}
                <p><strong>Subject:</strong> ${subject}</p>
              </div>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px;">
                <h3 style="color: #8B0000;">Message:</h3>
                <p style="white-space: pre-wrap;">${message}</p>
              </div>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send contact notification email to admin:', emailError);
        // Don't fail the contact creation if email fails
      }

      return responseHelper.success(res, doc, 'Message received. We will get back to you soon.', 201);
    } catch (err) {
      next(err);
    }
  },
];

// Admin list (optional)
exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status && ['new', 'read', 'responded', 'closed'].includes(status)) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      Contact.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit)),
      Contact.countDocuments(query),
    ]);

    return responseHelper.paginated(res, items, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      hasNext: parseInt(page) * parseInt(limit) < total,
      hasPrev: parseInt(page) > 1,
    }, 'Contact messages fetched');
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'read', 'responded', 'closed'].includes(status)) {
      return responseHelper.badRequest(res, 'Invalid status value');
    }

    const message = await Contact.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!message) {
      return responseHelper.notFound(res, 'Message not found');
    }

    return responseHelper.success(res, message, 'Message status updated successfully');
  } catch (err) {
    next(err);
  }
};
