import { requireAuth, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import {
  debugFacebookPermissions,
  mapFacebookConnectionPublic,
} from "@/services/facebook.service";
import { getIntegrationSettingsPublic } from "@/services/integration-settings.service";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const userId = authResult.session.user.id;
  const [debug, conn, settings] = await Promise.all([
    debugFacebookPermissions(userId),
    prisma.facebookConnection.findUnique({ where: { userId } }),
    getIntegrationSettingsPublic(userId),
  ]);

  return apiSuccess({
    ...debug,
    connection: conn
      ? mapFacebookConnectionPublic(conn, {
          hasLoginConfigId: settings.hasMetaLoginConfigId,
        })
      : null,
  });
}
