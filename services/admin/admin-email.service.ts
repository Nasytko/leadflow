import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import nodemailer from "nodemailer";

export type EmailSettingsPublic = {
  provider: string;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUsername: string | null;
  passwordConfigured: boolean;
  fromName: string | null;
  fromEmail: string | null;
  replyToEmail: string | null;
  enabled: boolean;
  lastSentAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  source: "db" | "env" | "none";
};

function envSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASS?.trim() &&
    process.env.SMTP_FROM?.trim()
  );
}

export async function getPlatformEmailSettings(): Promise<EmailSettingsPublic> {
  const row = await prisma.platformEmailSettings.findUnique({
    where: { id: "platform" },
  });

  if (row?.enabled && row.smtpHost) {
    return {
      provider: row.provider,
      smtpHost: row.smtpHost,
      smtpPort: row.smtpPort,
      smtpSecure: row.smtpSecure,
      smtpUsername: row.smtpUsername,
      passwordConfigured: !!row.smtpPasswordEncrypted,
      fromName: row.fromName,
      fromEmail: row.fromEmail,
      replyToEmail: row.replyToEmail,
      enabled: row.enabled,
      lastSentAt: row.lastSentAt?.toISOString() ?? null,
      lastError: row.lastError,
      lastErrorAt: row.lastErrorAt?.toISOString() ?? null,
      source: "db",
    };
  }

  if (envSmtpConfigured()) {
    return {
      provider: "smtp",
      smtpHost: process.env.SMTP_HOST ?? null,
      smtpPort: Number(process.env.SMTP_PORT ?? 587),
      smtpSecure: (process.env.SMTP_SECURE ?? "").toLowerCase() === "true",
      smtpUsername: process.env.SMTP_USER ?? null,
      passwordConfigured: !!process.env.SMTP_PASS,
      fromName: null,
      fromEmail: process.env.SMTP_FROM ?? null,
      replyToEmail: null,
      enabled: true,
      lastSentAt: null,
      lastError: null,
      lastErrorAt: null,
      source: "env",
    };
  }

  return {
    provider: row?.provider ?? "smtp",
    smtpHost: row?.smtpHost ?? null,
    smtpPort: row?.smtpPort ?? 587,
    smtpSecure: row?.smtpSecure ?? false,
    smtpUsername: row?.smtpUsername ?? null,
    passwordConfigured: !!row?.smtpPasswordEncrypted,
    fromName: row?.fromName ?? null,
    fromEmail: row?.fromEmail ?? null,
    replyToEmail: row?.replyToEmail ?? null,
    enabled: row?.enabled ?? false,
    lastSentAt: row?.lastSentAt?.toISOString() ?? null,
    lastError: row?.lastError ?? null,
    lastErrorAt: row?.lastErrorAt?.toISOString() ?? null,
    source: "none",
  };
}

export async function updatePlatformEmailSettings(data: {
  provider?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUsername?: string;
  smtpPassword?: string;
  fromName?: string;
  fromEmail?: string;
  replyToEmail?: string;
  enabled?: boolean;
}) {
  const existing = await prisma.platformEmailSettings.findUnique({
    where: { id: "platform" },
  });

  const passwordEncrypted =
    data.smtpPassword && data.smtpPassword.length > 0
      ? encrypt(data.smtpPassword)
      : existing?.smtpPasswordEncrypted;

  return prisma.platformEmailSettings.upsert({
    where: { id: "platform" },
    create: {
      id: "platform",
      provider: data.provider ?? "smtp",
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort ?? 587,
      smtpSecure: data.smtpSecure ?? false,
      smtpUsername: data.smtpUsername,
      smtpPasswordEncrypted: passwordEncrypted,
      fromName: data.fromName,
      fromEmail: data.fromEmail,
      replyToEmail: data.replyToEmail,
      enabled: data.enabled ?? false,
    },
    update: {
      provider: data.provider,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      smtpSecure: data.smtpSecure,
      smtpUsername: data.smtpUsername,
      ...(data.smtpPassword ? { smtpPasswordEncrypted: passwordEncrypted } : {}),
      fromName: data.fromName,
      fromEmail: data.fromEmail,
      replyToEmail: data.replyToEmail,
      enabled: data.enabled,
    },
  });
}

async function getTransporter() {
  const row = await prisma.platformEmailSettings.findUnique({
    where: { id: "platform" },
  });

  if (row?.enabled && row.smtpHost && row.smtpPasswordEncrypted) {
    return {
      transporter: nodemailer.createTransport({
        host: row.smtpHost,
        port: row.smtpPort ?? 587,
        secure: row.smtpSecure,
        auth: {
          user: row.smtpUsername ?? "",
          pass: decrypt(row.smtpPasswordEncrypted),
        },
      }),
      from: row.fromEmail
        ? row.fromName
          ? `"${row.fromName}" <${row.fromEmail}>`
          : row.fromEmail
        : row.fromEmail ?? "",
      source: "db" as const,
    };
  }

  if (envSmtpConfigured()) {
    return {
      transporter: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: (process.env.SMTP_SECURE ?? "").toLowerCase() === "true",
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASS!,
        },
      }),
      from: process.env.SMTP_FROM!,
      source: "env" as const,
    };
  }

  throw new Error("SMTP_NOT_CONFIGURED");
}

export async function testPlatformEmail(to: string) {
  const { transporter, from, source } = await getTransporter();
  await transporter.verify();
  await transporter.sendMail({
    from,
    to,
    subject: "ORVIX — test email",
    text: "This is a test email from ORVIX Platform Admin.",
    html: "<p>This is a <b>test email</b> from ORVIX Platform Admin.</p>",
  });

  if (source === "db") {
    await prisma.platformEmailSettings.update({
      where: { id: "platform" },
      data: { lastSentAt: new Date(), lastError: null, lastErrorAt: null },
    });
  }

  return { ok: true, source };
}

export async function getEmailStats() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sentToday = await prisma.systemLog.count({
    where: {
      source: "email",
      action: "sent",
      createdAt: { gte: todayStart },
    },
  });

  const failedToday = await prisma.systemLog.count({
    where: {
      source: "email",
      level: "error",
      createdAt: { gte: todayStart },
    },
  });

  return { sentToday, failedToday };
}
