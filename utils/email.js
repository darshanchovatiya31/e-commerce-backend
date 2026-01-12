const nodemailer = require('nodemailer');

//node mailer - Same as Blog Haven (using .env variables)
const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: true,
      port: 465,
      auth: {
        user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = transporter;
