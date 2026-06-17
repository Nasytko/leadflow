import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, hashToken } from "@/lib/encryption";
import { getAppUrl } from "@/lib/env";
import { getClientIp } from "@/lib/utils";
import { verifyTurnstileToken, isTurnstileEnabled } from "@/lib/turnstile";
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

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Invalid email" } },
        { status: 400 }
      );
    }

    const limit = await checkAuthRateLimit({
      action: "forgot_password",
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

    if (user) {
      const token = generateSecureToken(32);
      const tokenHash = hashToken(token);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const resetUrl = `${getAppUrl()}/${user.locale}/reset-password?token=${token}`;

      if (process.env.NODE_ENV === "development") {
        console.log(`Password reset link: ${resetUrl}`);
      }
    }

    return NextResponse.json({
      data: { message: "If the email exists, a reset link has been sent" },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Request failed" } },
      { status: 500 }
    );
  }
}
