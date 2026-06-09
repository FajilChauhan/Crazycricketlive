// src/shared/utils/email.service.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,   // your gmail address
    pass: process.env.GMAIL_PASS,   // gmail app password (NOT your account password)
  },
});

export const sendResetCodeEmail = async (toEmail: string, code: string) => {
  await transporter.sendMail({
    from: `"CricketApp" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "Your Password Reset Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #111; color: #fff; padding: 32px; border-radius: 16px;">
        <h2 style="color: #22c55e; margin-bottom: 8px;">Password Reset</h2>
        <p style="color: #aaa; margin-bottom: 24px;">Use the code below to reset your password. It expires in 15 minutes.</p>
        <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #22c55e;">${code}</span>
        </div>
        <p style="color: #555; font-size: 12px;">If you didn't request this, ignore this email. Your password won't change.</p>
      </div>
    `,
  });
};