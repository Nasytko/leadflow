import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { verifyEmailByToken } from "@/lib/email-verification";
import { getRegistrationMode } from "@/lib/registration";
import { createAuditLog } from "@/lib/audit";
import {
  checkAuthRateLimit,
  rateLimitedResponse,
} from "@/lib/security-rate-limit";

const schema = z.object({ token: z.string().min(1) });

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limit = await checkAuthRateLimit({
    action: "verify_email",
    request,
  });
  if (!limit.allowed) {
    return rateLimitedResponse(limit.retryAfterSeconds);
  }

  const { searchParams } = new URL(request.url);
  const parsed = schema.safeParse({ token: searchParams.get("token") });
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Invalid token" } },
      { status: 400 }
    );
  }

  try {
    const { userId } = await verifyEmailByToken(parsed.data.token);
    const mode = getRegistrationMode();

    if (mode === "approval_required") {
      await prisma.user.update({
        where: { id: userId },
        data: { status: "pending_approval" },
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { status: "active" },
      });
    }

    await createAuditLog({
      userId,
      action: "user.email_verified",
      ipAddress: ip,
      metadata: { registrationMode: mode },
    });

    return NextResponse.json({ data: { ok: true, status: mode === "approval_required" ? "pending_approval" : "active" } });
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } },
      { status: 400 }
    );
  }
}

