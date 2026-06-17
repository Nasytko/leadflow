import nodemailer from "nodemailer";
import { isProduction } from "@/lib/env";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function getSmtpConfig(): {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
} | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const secure = (process.env.SMTP_SECURE ?? "").toLowerCase() === "true";

  if (!host || !user || !pass || !from) return null;
  return { host, port, secure, user, pass, from };
}

export async function sendEmail(message: EmailMessage) {
  const cfg = getSmtpConfig();

  if (!cfg) {
    if (isProduction()) {
      throw new Error("SMTP_NOT_CONFIGURED");
    }
    // Dev fallback
    // eslint-disable-next-line no-console
    console.log("[DEV EMAIL]", {
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  await transporter.sendMail({
    from: cfg.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

