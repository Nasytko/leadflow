import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const users = await prisma.user.findMany({
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
      _count: {
        select: {
          facebookPages: true,
          leads: true,
        },
      },
    },
  });

  const formsCountByUser = await prisma.facebookForm.groupBy({
    by: ["pageId"],
    _count: { _all: true },
  }).catch(() => []);

  // lightweight: forms per user via page relation
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
      ...u,
      pagesCount: u._count.facebookPages,
      leadsCount: u._count.leads,
      formsCount: formsByUser.get(u.id) ?? 0,
    })),
  });
}

const patchSchema = z.object({
  action: z.enum(["approve", "block", "unblock", "make_admin", "remove_admin"]),
});

export async function PATCH(request: Request) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION", "Invalid input", 400);

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return apiError("VALIDATION", "userId required", 400);

  const data: Record<string, unknown> = {};
  if (parsed.data.action === "approve") data.status = "active";
  if (parsed.data.action === "block") data.status = "blocked";
  if (parsed.data.action === "unblock") data.status = "active";
  if (parsed.data.action === "make_admin") data.isAdmin = true;
  if (parsed.data.action === "remove_admin") data.isAdmin = false;

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, status: true, isAdmin: true },
  });

  return apiSuccess({ user: updated });
}

