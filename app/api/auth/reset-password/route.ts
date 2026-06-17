import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/encryption";
import { getClientIp } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import {
  checkAuthRateLimit,
  rateLimitedResponse,
} from "@/lib/security-rate-limit";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = await checkAuthRateLimit({
    action: "reset_password",
    request,
  });
  if (!limit.allowed) {
    return rateLimitedResponse(limit.retryAfterSeconds);
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(parsed.data.token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt < new Date()
    ) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await createAuditLog({
      userId: resetToken.userId,
      action: "user.password_reset",
      ipAddress: ip,
    });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Reset failed" } },
      { status: 500 }
    );
  }
}
