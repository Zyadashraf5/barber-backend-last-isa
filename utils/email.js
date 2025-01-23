const nodemailer = require("nodemailer");

// Generate an HTML email template
const generateEmailTemplate = ({ name, message }) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            color: #333;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .email-header {
            background: #007bff;
            color: #ffffff;
            padding: 20px;
            text-align: center;
        }
        .email-header h1 {
            margin: 0;
            font-size: 24px;
        }
        .email-body {
            padding: 20px;
        }
        .email-body p {
            font-size: 16px;
            line-height: 1.5;
        }
        .email-footer {
            background: #f4f4f4;
            text-align: center;
            padding: 10px;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>Welcome to Salon Barber!</h1>
        </div>
        <div class="email-body">
            <p>Hi ${name},</p>
            <p>${message}</p>
            <p>We're excited to have you with us!</p>
        </div>
        <div class="email-footer">
            <p>&copy; 2024 Salon Barber. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: "smtp.titan.email", // Gmail SMTP server
        port: 465, // Secure SMTP port
        secure: true,
        auth: {
            user: "sender@salonat-kw.com",
            pass: "LOVEyou16@",
        },
    });

    // Generate the HTML template
    const htmlContent = generateEmailTemplate({
        name: options.name,
        message: options.message,
    });

    const mailOptions = {
        from: "sender@salonat-kw.com",
        to: options.email,
        subject: options.subject,
        html: htmlContent, // Use the HTML template
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
