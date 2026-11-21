import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ==================== Email Configuration ====================
const emailConfig = {
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
};

// Create transporter instance
let transporter = nodemailer.createTransport(emailConfig);

/**
 * Verify email configuration on service startup
 * Logs connection status to console
 */
const verifyEmailConfig = async () => {
  try {
    const verified = await transporter.verify();
    if (verified) {
      console.log('✅ Email service is configured and ready to send emails');
    } else {
      console.warn('⚠️  Email service is not properly configured. Check credentials.');
    }
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    console.error('   Please check EMAIL_USER and EMAIL_PASSWORD in .env file');
  }
};

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} userName - User's name for personalization
 * @param {string} resetToken - JWT reset token
 * @param {string} resetUrl - Frontend reset password URL with token
 * @returns {Promise<object>} - Email send result
 */
export const sendPasswordResetEmail = async (email, userName, resetToken, resetUrl) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn(
        '⚠️  Email credentials not configured. Password reset email not sent.'
      );
      return { success: false, message: 'Email service not configured' };
    }

    // HTML email template
    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
            padding: 30px 20px;
            text-align: center;
            color: white;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 5px;
          }
          .header p {
            font-size: 14px;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 16px;
            color: #333;
            margin-bottom: 20px;
          }
          .greeting strong {
            color: #0066CC;
          }
          .message {
            font-size: 14px;
            color: #666;
            line-height: 1.6;
            margin-bottom: 30px;
          }
          .emphasis {
            color: #e74c3c;
            font-weight: 600;
          }
          .cta-button {
            display: inline-block;
            padding: 14px 40px;
            background-color: #0066CC;
            color: white !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 30px 0;
            transition: background-color 0.3s;
          }
          .cta-button:hover {
            background-color: #0052A3;
          }
          .alternative {
            background-color: #f9f9f9;
            border: 1px solid #e0e0e0;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 12px;
            color: #666;
          }
          .token-display {
            word-break: break-all;
            font-family: 'Courier New', monospace;
            color: #0066CC;
            margin: 10px 0;
            font-size: 11px;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 20px 30px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #999;
          }
          .footer-note {
            margin-bottom: 10px;
            line-height: 1.6;
          }
          .security-note {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 13px;
            color: #856404;
          }
          .security-note strong {
            color: #721c24;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>Smart Hospital</h1>
            <p>Password Reset Request</p>
          </div>

          <!-- Content -->
          <div class="content">
            <div class="greeting">
              Hello <strong>${userName || 'User'}</strong>,
            </div>

            <div class="message">
              We received a request to reset the password associated with your Smart Hospital account. 
              If you did not make this request, you can safely ignore this email.
            </div>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="cta-button">Reset Password</a>
              <p style="font-size: 13px; color: #999; margin-top: 10px;">
                The link above will expire in <strong>1 hour</strong>
              </p>
            </div>

            <!-- Security Note -->
            <div class="security-note">
              <strong>🔒 Security Notice:</strong> Never share this link with anyone. 
              Smart Hospital staff will never ask for your password reset link.
            </div>

            <!-- Alternative Method -->
            <div class="alternative">
              <strong>Can't click the button above?</strong><br>
              Copy and paste this link in your browser address bar:<br>
              <div class="token-display">${resetUrl}</div>
            </div>

            <div class="message">
              <strong>What happens next:</strong><br>
              1. Click the reset password link above<br>
              2. Enter your new password (must be at least 8 characters with uppercase, lowercase, digit, and special character)<br>
              3. Confirm your new password<br>
              4. You'll be able to login with your new password
            </div>

            <div class="message" style="color: #e74c3c; font-size: 13px;">
              <strong>⏰ Remember:</strong> This link expires in 1 hour for security reasons. 
              If it expires, simply request a new password reset.
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-note">
              <strong>Need help?</strong> Contact our support team at support@smarthospital.com
            </div>
            <div class="footer-note">
              This is an automated email. Please do not reply directly to this message.
            </div>
            <div class="footer-note">
              © ${new Date().getFullYear()} Smart Hospital. All rights reserved.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text version
    const textTemplate = `
Smart Hospital - Password Reset Request

Hello ${userName || 'User'},

We received a request to reset the password associated with your Smart Hospital account.

To reset your password, click the link below (valid for 1 hour):
${resetUrl}

If you did not request this password reset, you can safely ignore this email.

Security Notice: Never share this link with anyone. Smart Hospital staff will never ask for your password reset link.

Steps:
1. Click the link above
2. Enter your new password (minimum 8 characters: uppercase, lowercase, digit, special character)
3. Confirm your password
4. Login with your new credentials

This link expires in 1 hour for security reasons.

Need help? Contact: support@smarthospital.com

© ${new Date().getFullYear()} Smart Hospital. All rights reserved.
This is an automated email. Please do not reply directly.
    `;

    // ==================== Send Email ====================
    const mailOptions = {
      from: `Smart Hospital <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - Smart Hospital',
      text: textTemplate,
      html: htmlTemplate,
      replyTo: 'support@smarthospital.com',
    };

    const result = await transporter.sendMail(mailOptions);

    console.log(
      `✅ Password reset email sent to ${email} (Message ID: ${result.messageId})`
    );

    return {
      success: true,
      message: 'Password reset email sent successfully',
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.message);
    return {
      success: false,
      message: 'Failed to send password reset email',
      error: error.message,
    };
  }
};

/**
 * Send email verification email
 * @param {string} email - Recipient email address
 * @param {string} userName - User's name
 * @param {string} verificationUrl - Frontend email verification URL
 * @returns {Promise<object>} - Email send result
 */
export const sendVerificationEmail = async (email, userName, verificationUrl) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️  Email credentials not configured. Verification email not sent.');
      return { success: false, message: 'Email service not configured' };
    }

    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #00AA66 0%, #008850 100%); padding: 30px 20px; text-align: center; color: white; }
          .header h1 { font-size: 28px; font-weight: 600; }
          .content { padding: 40px 30px; }
          .message { font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 20px; }
          .cta-button { display: inline-block; padding: 14px 40px; background-color: #00AA66; color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .footer { background-color: #f5f5f5; padding: 20px 30px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Smart Hospital</h1>
            <p>Verify Your Email Address</p>
          </div>
          <div class="content">
            <div class="message">Hello ${userName || 'User'},</div>
            <div class="message">Thank you for signing up with Smart Hospital! Please verify your email address to complete your registration.</div>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="cta-button">Verify Email Address</a>
            </div>
            <div class="message">If you didn't create this account, you can safely ignore this email.</div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Smart Hospital. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `Smart Hospital <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - Smart Hospital',
      html: htmlTemplate,
      replyTo: 'support@smarthospital.com',
    };

    const result = await transporter.sendMail(mailOptions);

    console.log(`✅ Verification email sent to ${email}`);

    return {
      success: true,
      message: 'Verification email sent successfully',
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('❌ Error sending verification email:', error.message);
    return {
      success: false,
      message: 'Failed to send verification email',
      error: error.message,
    };
  }
};

/**
 * Send welcome email
 * @param {string} email - Recipient email address
 * @param {string} userName - User's name
 * @returns {Promise<object>} - Email send result
 */
export const sendWelcomeEmail = async (email, userName) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️  Email credentials not configured. Welcome email not sent.');
      return { success: false, message: 'Email service not configured' };
    }

    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #0066CC 0%, #00AA66 100%); padding: 30px 20px; text-align: center; color: white; }
          .header h1 { font-size: 28px; font-weight: 600; }
          .content { padding: 40px 30px; }
          .message { font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 20px; }
          .footer { background-color: #f5f5f5; padding: 20px 30px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Smart Hospital</h1>
          </div>
          <div class="content">
            <div class="message">Hello ${userName || 'User'},</div>
            <div class="message">Welcome to Smart Hospital! Your account has been successfully created.</div>
            <div class="message">You can now:</div>
            <ul style="padding-left: 20px; margin-bottom: 20px;">
              <li style="margin-bottom: 10px; color: #666;">Search for hospitals near you</li>
              <li style="margin-bottom: 10px; color: #666;">Compare healthcare costs</li>
              <li style="margin-bottom: 10px; color: #666;">Read hospital reviews</li>
              <li style="margin-bottom: 10px; color: #666;">Save your favorite hospitals</li>
              <li style="margin-bottom: 10px; color: #666;">Get personalized recommendations</li>
            </ul>
            <div class="message">If you have any questions, feel free to contact our support team.</div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Smart Hospital. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `Smart Hospital <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Smart Hospital!',
      html: htmlTemplate,
      replyTo: 'support@smarthospital.com',
    };

    const result = await transporter.sendMail(mailOptions);

    console.log(`✅ Welcome email sent to ${email}`);

    return {
      success: true,
      message: 'Welcome email sent successfully',
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error.message);
    return {
      success: false,
      message: 'Failed to send welcome email',
      error: error.message,
    };
  }
};

export default {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  verifyEmailConfig,
};
