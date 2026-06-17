import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/utils";
import { verifyTurnstileToken, isTurnstileEnabled } from "@/lib/turnstile";
import {
  createEmailVerificationToken,
  sendVerificationEmail,
} from "@/lib/email-verification";
import { createAuditLog } from "@/lib/audit";
import {
  checkAuthRateLimit,
  rateLimitedResponse,
} from "@/lib/security-rate-limit";

const schema = z.object({
  email: z.string().email(),
  turnstileToken: z.string().optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid input" } },
      { status: 400 }
    );
  }

  const limit = await checkAuthRateLimit({
    action: "resend_verification",
    request,
    email: parsed.data.email,
  });
  if (!limit.allowed) {
    return rateLimitedResponse(limit.retryAfterSeconds);
  }

  if (isTurnstileEnabled()) {
    if (!parsed.data.turnstileToken) {
      return NextResponse.json(
        { error: { code: "TURNSTILE_REQUIRED", message: "Captcha required" } },
        { status: 400 }
      );
    }
    const verify = await verifyTurnstileToken({
      token: parsed.data.turnstileToken,
      ip,
    });
    if (!verify.ok) {
      return NextResponse.json(
        { error: { code: "TURNSTILE_INVALID", message: "Captcha failed" } },
        { status: 400 }
      );
    }
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Always return success to avoid account enumeration
  if (!user) {
    return NextResponse.json({
      data: { message: "If the email exists, a verification link has been sent" },
    });
  }

  if (user.status === "active") {
    return NextResponse.json({
      data: { message: "Account already verified" },
    });
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
    action: "user.resend_verification",
    ipAddress: ip,
  });

  return NextResponse.json({
    data: { message: "If the email exists, a verification link has been sent" },
  });
}

