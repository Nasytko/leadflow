import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";
import {
  syncUserForms,
  InvalidFacebookTokenError,
} from "@/services/facebook.service";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const [forms, facebookConn] = await Promise.all([
    prisma.facebookForm.findMany({
      where: { page: { userId: authResult.session.user.id } },
      include: { page: { select: { pageName: true, pageId: true } } },
      orderBy: { formName: "asc" },
    }),
    prisma.facebookConnection.findUnique({
      where: { userId: authResult.session.user.id },
      select: { status: true, lastError: true },
    }),
  ]);

  return apiSuccess({
    forms: forms.map((f) => ({
      id: f.id,
      formId: f.formId,
      formName: f.formName,
      enabled: f.enabled,
      status: f.status,
      syncStatus: f.syncStatus,
      lastSyncError: f.lastSyncError,
      lastSyncAt: f.lastSyncAt,
      createdAt: f.createdAt,
      pageName: f.page.pageName,
      pageId: f.page.pageId,
    })),
    facebookStatus: facebookConn?.status ?? "disconnected",
    facebookLastError: facebookConn?.lastError,
  });
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

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
