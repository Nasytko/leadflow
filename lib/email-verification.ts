import { prisma } from "@/lib/prisma";
import { generateSecureToken, hashToken } from "@/lib/encryption";
import { getAppUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email";

export async function createEmailVerificationToken(params: {
  userId: string;
  email: string;
  locale: "ru" | "en";
}): Promise<{ token: string; verifyUrl: string; expiresAt: Date }> {
  const token = generateSecureToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: {
      userId: params.userId,
      tokenHash,
      expiresAt,
    },
  });

  const verifyUrl = `${getAppUrl()}/${params.locale}/verify-email?token=${token}`;
  return { token, verifyUrl, expiresAt };
}

export async function sendVerificationEmail(params: {
  to: string;
  locale: "ru" | "en";
  verifyUrl: string;
}) {
  const subject =
    params.locale === "ru" ? "Подтвердите email в LeadBridge" : "Verify your email in LeadBridge";
  const text =
    params.locale === "ru"
      ? `Подтвердите email, чтобы активировать аккаунт в LeadBridge:\n\n${params.verifyUrl}\n\nСсылка действует 1 час.`
      : `Verify your email to activate your LeadBridge account:\n\n${params.verifyUrl}\n\nLink expires in 1 hour.`;

  await sendEmail({ to: params.to, subject, text });
}

export async function verifyEmailByToken(token: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new Error("INVALID_OR_EXPIRED_TOKEN");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { userId: record.userId };
}

