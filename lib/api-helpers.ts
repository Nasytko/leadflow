import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitByIp } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { CSRF_HEADER } from "@/lib/csrf-constants";
import { validateCsrfToken } from "@/lib/csrf";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, status: true, isAdmin: true, emailVerifiedAt: true, locale: true },
  });
  if (!user) {
    return { error: NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 }) };
  }

  if (user.status !== "active") {
    return {
      error: NextResponse.json(
        {
          error: {
            code: "ACCOUNT_INACTIVE",
            message: "Account is not active",
            status: user.status,
          },
        },
        { status: 403 }
      ),
    };
  }

  if (!user.emailVerifiedAt) {
    return {
      error: NextResponse.json(
        {
          error: {
            code: "EMAIL_NOT_VERIFIED",
            message: "Email verification required",
          },
        },
        { status: 403 }
      ),
    };
  }

  return { session, user };
}

export async function requireAdmin() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult;
  if (!authResult.user.isAdmin) {
    return {
      error: NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      ),
    };
  }
  return authResult;
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

export async function requireCsrf(request: Request) {
  const token = request.headers.get(CSRF_HEADER);
  const valid = await validateCsrfToken(token);
  if (valid) return null;
  return NextResponse.json(
    { error: { code: "CSRF_INVALID", message: "Invalid or missing CSRF token" } },
    { status: 403 }
  );
}

export async function requireAuthWithCsrf(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult;
  const csrfError = await requireCsrf(request);
  if (csrfError) return { error: csrfError };
  return authResult;
}

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}
