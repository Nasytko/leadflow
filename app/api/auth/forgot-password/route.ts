import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, hashToken } from "@/lib/encryption";
import { rateLimitByIp } from "@/lib/rate-limit";
import { getAppUrl } from "@/lib/env";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = await rateLimitByIp(ip, 5, 60);
  if (!limit.success) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests" } },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Invalid email" } },
        { status: 400 }
      );
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
