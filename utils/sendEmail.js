const nodemailer = require('nodemailer');

// Nodemailer

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false, // ✅ يتجاهل self-signed certificates
    },
  });


  

 // 2) Define email options (like from, to, subject, email content)
 const mailOpts = {
  from: 'Master-Club App <esraaalrassas@gmail.com>',
  to: options.email,
  subject: options.subject,
  text: options.message, 
  html: options.html || options.message, // يدعم HTML، ولو مش موجود يستخدم النص العادي
};

  // 3) Send email
  await transporter.sendMail(mailOpts);
};

module.exports = sendEmail;