import { requireAuth, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";
import {
  checkFacebookConnection,
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

  const userId = authResult.session.user.id;

  try {
    const result = await checkFacebookConnection(userId);

    if (!result.ok) {
      const [conn, settings] = await Promise.all([
        prisma.facebookConnection.findUnique({ where: { userId } }),
        getIntegrationSettingsPublic(userId),
      ]);
      return apiSuccess({
        ok: false,
        facebook: conn
          ? mapFacebookConnectionPublic(conn, {
              hasLoginConfigId: settings.hasMetaLoginConfigId,
            })
          : { status: result.status, lastError: result.lastError },
      });
    }

    const settings = await getIntegrationSettingsPublic(userId);

    await createAuditLog({
      userId,
      action: "facebook.check",
      ipAddress: getClientIp(request),
    });

    return apiSuccess({
      ok: true,
      facebook: mapFacebookConnectionPublic(result.connection, {
        hasLoginConfigId: settings.hasMetaLoginConfigId,
      }),
    });
  } catch (error) {
    if (error instanceof InvalidFacebookTokenError) {
      return apiError("INVALID_FACEBOOK_TOKEN", error.message, 401);
    }
    const message = error instanceof Error ? error.message : "Check failed";
    return apiError("CHECK_FAILED", message, 500);
  }
}
