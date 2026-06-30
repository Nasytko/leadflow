import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, checkRateLimit, apiSuccess, apiError, requireCsrf } from "@/lib/api-helpers";
import { logAdminAction } from "@/lib/admin-auth";
import {
  createEmailVerificationToken,
  sendVerificationEmail,
} from "@/lib/email-verification";

export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const users = await     prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      isAdmin: true,
      createdAt: true,
      lastLoginAt: true,
      emailVerifiedAt: true,
      facebookConnection: { select: { status: true } },
      telegramConnection: { select: { status: true } },
      _count: {
        select: {
          facebookPages: true,
          leads: true,
        },
      },
    },
  });

  const pages = await prisma.facebookPage.findMany({
    select: { id: true, userId: true },
  });
  const forms = await prisma.facebookForm.findMany({
    select: { pageId: true },
  });
  const formsByPage = new Map<string, number>();
  for (const f of forms) formsByPage.set(f.pageId, (formsByPage.get(f.pageId) ?? 0) + 1);
  const formsByUser = new Map<string, number>();
  for (const p of pages) {
    const c = formsByPage.get(p.id) ?? 0;
    formsByUser.set(p.userId, (formsByUser.get(p.userId) ?? 0) + c);
  }

  return apiSuccess({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      status: u.status,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      emailVerifiedAt: u.emailVerifiedAt,
      facebookConnected: u.facebookConnection?.status === "connected",
      telegramConnected: u.telegramConnection?.status === "connected",
      pagesCount: u._count.facebookPages,
      leadsCount: u._count.leads,
      formsCount: formsByUser.get(u.id) ?? 0,
    })),
  });
}

const patchSchema = z.object({
  action: z.enum([
    "approve",
    "block",
    "unblock",
    "make_admin",
    "remove_admin",
    "verify_email",
    "resend_verification",
  ]),
});

export async function PATCH(request: Request) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION", "Invalid input", 400);

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return apiError("VALIDATION", "userId required", 400);

  const actorId = authResult.session.user.id;
  if (
    userId === actorId &&
    (parsed.data.action === "block" ||
      parsed.data.action === "remove_admin")
  ) {
    return apiError("FORBIDDEN", "Cannot modify your own admin access or block yourself", 403);
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerifiedAt: true, isAdmin: true, email: true, status: true },
  });
  if (!target) return apiError("NOT_FOUND", "User not found", 404);

  const data: Record<string, unknown> = {};
  if (parsed.data.action === "approve") {
    if (!target.emailVerifiedAt) {
      return apiError("EMAIL_NOT_VERIFIED", "User must verify email before approval", 400);
    }
    data.status = "active";
  }
  if (parsed.data.action === "block") data.status = "blocked";
  if (parsed.data.action === "unblock") data.status = "active";
  if (parsed.data.action === "make_admin") data.isAdmin = true;
  if (parsed.data.action === "verify_email") {
    data.emailVerifiedAt = new Date();
    if (target.status === "pending_email_verification") data.status = "active";
  }
  if (parsed.data.action === "resend_verification") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, locale: true },
    });
    if (!user) return apiError("NOT_FOUND", "User not found", 404);
    const { verifyUrl } = await createEmailVerificationToken({
      userId,
      email: user.email,
      locale: user.locale as "ru" | "en",
    });
    await sendVerificationEmail({
      to: user.email,
      locale: user.locale as "ru" | "en",
      verifyUrl,
    });
    await logAdminAction({
      adminUserId: actorId,
      action: "resend_verification",
      resource: userId,
      metadata: { targetEmail: target.email },
      request,
    });
    return apiSuccess({ sent: true });
  }
  if (parsed.data.action === "remove_admin") {
    if (target.isAdmin) {
      const adminCount = await prisma.user.count({ where: { isAdmin: true } });
      if (adminCount <= 1) {
        return apiError("FORBIDDEN", "Cannot remove the last admin", 403);
      }
    }
    data.isAdmin = false;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, status: true, isAdmin: true, emailVerifiedAt: true },
  });

  await logAdminAction({
    adminUserId: actorId,
    action: `user_${parsed.data.action}`,
    resource: userId,
    metadata: { email: updated.email },
    request,
  });

  return apiSuccess({ user: updated });
}

