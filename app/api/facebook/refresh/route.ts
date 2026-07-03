import { requireAuth, checkRateLimit, apiSuccess, apiError, requireCsrf } from "@/lib/api-helpers";
import {
  checkFacebookConnection,
  syncUserPages,
  syncFormsForAllDiscoveredPages,
  InvalidFacebookTokenError,
  mapFacebookConnectionPublic,
} from "@/services/facebook.service";
import { getIntegrationSettingsPublic } from "@/services/integration-settings.service";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const userId = authResult.session.user.id;

  try {
    const check = await checkFacebookConnection(userId);

    let pagesSynced = 0;
    let formsSynced = 0;
    let pagesError: string | undefined;
    let formsError: string | undefined;

    if (check.ok) {
      try {
        const pages = await syncUserPages(userId);
        pagesSynced = pages.length;
      } catch (err) {
        pagesError = err instanceof Error ? err.message : "Pages sync failed";
      }

      try {
        const forms = await syncFormsForAllDiscoveredPages(userId);
        formsSynced = forms.synced;
      } catch (err) {
        formsError = err instanceof Error ? err.message : "Forms sync failed";
      }
    }

    const [conn, settings, connectedPages, activeForms] = await Promise.all([
      prisma.facebookConnection.findUnique({ where: { userId } }),
      getIntegrationSettingsPublic(userId),
      prisma.facebookPage.count({ where: { userId, connected: true } }),
      prisma.facebookForm.count({
        where: { enabled: true, page: { userId, connected: true } },
      }),
    ]);

    await createAuditLog({
      userId,
      action: "facebook.refresh",
      ipAddress: getClientIp(request),
      metadata: {
        ok: check.ok,
        pagesSynced,
        formsSynced,
        pagesError: pagesError ?? null,
        formsError: formsError ?? null,
      },
    });

    if (!conn) {
      return apiSuccess({
        ok: false,
        facebook: null,
        pagesSynced,
        formsSynced,
        pagesError,
        formsError,
      });
    }

    return apiSuccess({
      ok: check.ok,
      pagesSynced,
      formsSynced,
      pagesError,
      formsError,
      facebook: mapFacebookConnectionPublic(conn, {
        hasLoginConfigId: settings.hasMetaLoginConfigId,
        connectedPagesCount: connectedPages,
        activeFormsCount: activeForms,
      }),
    });
  } catch (error) {
    if (error instanceof InvalidFacebookTokenError) {
      return apiError("INVALID_FACEBOOK_TOKEN", error.message, 401);
    }
    const message = error instanceof Error ? error.message : "Refresh failed";
    return apiError("REFRESH_FAILED", message, 500);
  }
}
