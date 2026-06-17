import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitByIp } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { verifyEmailByToken } from "@/lib/email-verification";
import { getRegistrationMode } from "@/lib/registration";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({ token: z.string().min(1) });

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limit = await rateLimitByIp(ip, 20, 60);
  if (!limit.success) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests" } },
      { status: 429 }
    );
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

