import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess, apiError, requireCsrf } from "@/lib/api-helpers";
import {
  syncUserForms,
  InvalidFacebookTokenError,
} from "@/services/facebook.service";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const userId = authResult.session.user.id;

  const [forms, facebookConn] = await Promise.all([
    prisma.facebookForm.findMany({
      where: { page: { userId } },
      include: { page: { select: { pageName: true, pageId: true } } },
      orderBy: [{ metaCreatedAt: "desc" }, { formName: "asc" }],
    }),
    prisma.facebookConnection.findUnique({
      where: { userId },
      select: { status: true, lastError: true },
    }),
  ]);

  const formIds = forms.map((form) => form.id);
  const leadStats =
    formIds.length > 0
      ? await prisma.lead.groupBy({
          by: ["formId"],
          where: { userId, formId: { in: formIds } },
          _count: { id: true },
          _max: { createdTime: true },
        })
      : [];

  const statsByFormId = new Map(
    leadStats.map((row) => [
      row.formId,
      { leadCount: row._count.id, lastLeadAt: row._max.createdTime },
    ])
  );

  return apiSuccess({
    forms: forms.map((f) => {
      const stats = statsByFormId.get(f.id);
      return {
        id: f.id,
        formId: f.formId,
        formName: f.formName,
        enabled: f.enabled,
        status: f.status,
        syncStatus: f.syncStatus,
        lastSyncError: f.lastSyncError,
        lastSyncAt: f.lastSyncAt,
        createdAt: f.createdAt,
        metaCreatedAt: f.metaCreatedAt,
        leadCount: stats?.leadCount ?? 0,
        lastLeadAt: stats?.lastLeadAt ?? null,
        pageName: f.page.pageName,
        pageId: f.page.pageId,
      };
    }),
    facebookStatus: facebookConn?.status ?? "disconnected",
    facebookLastError: facebookConn?.lastError,
  });
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  try {
    const { synced } = await syncUserForms(authResult.session.user.id);
    return apiSuccess({ synced });
  } catch (error) {
    if (error instanceof InvalidFacebookTokenError) {
      return apiError("INVALID_FACEBOOK_TOKEN", error.message, 401);
    }
    const message = error instanceof Error ? error.message : "Sync failed";
    return apiError("SYNC_FAILED", message, 500);
  }
}
