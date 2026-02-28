// ─────────────────────────────────────────────────────────────────────────────
// lib/email.ts — Nodemailer transporter + typed email templates
//
// All outbound emails go through sendMail(). Add new template functions below.
// ─────────────────────────────────────────────────────────────────────────────
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(options: MailOptions): Promise<void> {
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    ...options,
  });
}

// ── Email templates ──────────────────────────────────────────────────────────

export function buildPasswordResetEmail(resetUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset your Mind Palace password</h2>
      <p>Click the link below to reset your password. This link expires in <strong>1 hour</strong>.</p>
      <p>
        <a href="${resetUrl}" style="
          display: inline-block;
          background: #6366F1;
          color: #fff;
          padding: 12px 24px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
        ">Reset Password</a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        If you did not request this, you can safely ignore this email.
      </p>
    </div>
  `;
}

export function buildWelcomeEmail(displayName: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Mind Palace, ${displayName}!</h2>
      <p>Your account has been created. Start saving and organising your bookmarks.</p>
    </div>
  `;
}
