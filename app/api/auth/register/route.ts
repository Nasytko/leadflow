import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimitByIp } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
  locale: z.enum(["ru", "en"]).optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = await rateLimitByIp(ip, 10, 60);
  if (!limit.success) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests" } },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const { email, password, name, locale } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: { code: "EMAIL_EXISTS", message: "Email already registered" } },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        locale: locale ?? "ru",
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "user.register",
      ipAddress: ip,
    });

    return NextResponse.json({
      data: { id: user.id, email: user.email },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Registration failed" } },
      { status: 500 }
    );
  }
}
