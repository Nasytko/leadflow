import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import { verifyTurnstileToken, isTurnstileEnabled } from "@/lib/turnstile";
import { getRegistrationMode, consumeInviteCode } from "@/lib/registration";
import {
  createEmailVerificationToken,
  sendVerificationEmail,
} from "@/lib/email-verification";
import {
  checkAuthRateLimit,
  rateLimitedResponse,
} from "@/lib/security-rate-limit";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
  locale: z.enum(["ru", "en"]).optional(),
  turnstileToken: z.string().optional(),
  inviteCode: z.string().optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);

  try {
    const body = await request.clone().json();
    const emailForLimit =
      typeof body?.email === "string" ? body.email : undefined;
    const limit = await checkAuthRateLimit({
      action: "register",
      request,
      email: emailForLimit,
    });
    if (!limit.allowed) {
      return rateLimitedResponse(limit.retryAfterSeconds);
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const { email, password, name, locale, turnstileToken, inviteCode } =
      parsed.data;

    if (isTurnstileEnabled()) {
      if (!turnstileToken) {
        return NextResponse.json(
          { error: { code: "TURNSTILE_REQUIRED", message: "Captcha required" } },
          { status: 400 }
        );
      }
      const verify = await verifyTurnstileToken({ token: turnstileToken, ip });
      if (!verify.ok) {
        return NextResponse.json(
          { error: { code: "TURNSTILE_INVALID", message: "Captcha failed" } },
          { status: 400 }
        );
      }
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: { code: "EMAIL_EXISTS", message: "Email already registered" } },
        { status: 409 }
      );
    }

    const mode = getRegistrationMode();
    if (mode === "invite_only") {
      if (!inviteCode?.trim()) {
        return NextResponse.json(
          { error: { code: "INVITE_REQUIRED", message: "Invite code required" } },
          { status: 400 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        locale: locale ?? "ru",
        status: "pending_email_verification",
      },
    });

    if (mode === "invite_only") {
      await consumeInviteCode(inviteCode!, user.id);
    }

    const { verifyUrl } = await createEmailVerificationToken({
      userId: user.id,
      email: user.email,
      locale: (user.locale as "ru" | "en") ?? "ru",
    });
    await sendVerificationEmail({
      to: user.email,
      locale: (user.locale as "ru" | "en") ?? "ru",
      verifyUrl,
    });

    await createAuditLog({
      userId: user.id,
      action: "user.register",
      ipAddress: ip,
    });

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        verificationRequired: true,
        registrationMode: mode,
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Registration failed" } },
      { status: 500 }
    );
  }
}
