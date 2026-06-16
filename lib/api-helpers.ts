import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitByIp } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 }) };
  }
  return { session };
}

export async function checkRateLimit(request: Request, userId?: string) {
  const ip = getClientIp(request);
  const ipLimit = await rateLimitByIp(ip, 100, 60);
  if (!ipLimit.success) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests" } },
      { status: 429 }
    );
  }
  if (userId) {
    const { rateLimitByUser } = await import("@/lib/rate-limit");
    const userLimit = await rateLimitByUser(userId, 200, 60);
    if (!userLimit.success) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests" } },
        { status: 429 }
      );
    }
  }
  return null;
}

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}
