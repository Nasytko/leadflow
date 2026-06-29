import {
  getMetaCredentials,
  getLoginConfigId,
  getDeploymentMode,
  getPlatformLoginConfigStatus,
  isMetaConfiguredForUser,
} from "@/services/integration-settings.service";
import { buildOAuthUrlPreview } from "@/services/facebook-auth.service";
import { requireAuth, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getLastOAuthError } from "@/lib/facebook-oauth-status";
import { getRedirectUri } from "@/lib/env";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const userId = authResult.session.user.id;
  const isAdmin = authResult.session.user.isAdmin === true;
  const creds = await getMetaCredentials(userId);
  const preview = await buildOAuthUrlPreview(userId);
  const loginConfigId = await getLoginConfigId(userId);
  const platformConfig = getPlatformLoginConfigStatus();

  const [connection, pagesCount, businessesCount, lastCallbackLog, lastOAuthError, lastSyncErrorLog] =
    await Promise.all([
      prisma.facebookConnection.findUnique({ where: { userId } }),
      prisma.facebookPage.count({ where: { userId } }),
      prisma.facebookBusiness.count({ where: { userId } }),
      prisma.systemLog.findFirst({
        where: {
          userId,
          source: "facebook",
          action: "facebook.oauth.callback.started",
        },
        orderBy: { createdAt: "desc" },
      }),
      getLastOAuthError(userId),
      prisma.systemLog.findFirst({
        where: {
          userId,
          source: "facebook",
          action: { in: ["facebook.oauth.sync_finished", "facebook.oauth.callback.failed"] },
          level: { in: ["warn", "error"] },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const configId = preview?.configId ?? loginConfigId;
  const configIdPresent = preview?.configIdPresent ?? !!loginConfigId;
  const configIdValid = preview?.configIdValid ?? false;
  const oauthUrl = preview?.oauthUrl ?? null;

  return apiSuccess({
    configId: isAdmin ? configId : configIdValid ? "configured" : null,
    configIdPresent,
    configIdValid,
    oauthUrl: isAdmin ? oauthUrl : null,
    appId: creds?.appId ?? preview?.appId ?? null,
    redirectUri: getRedirectUri(),
    hasAppSecret: !!(creds?.appSecret),
    ...(isAdmin
      ? {
          deploymentMode: getDeploymentMode(),
          platformConfigEnvRaw: platformConfig.envRaw,
          loginConfigIdUsed: configId,
          oauthUrlPreview: oauthUrl,
          scopes: preview?.scopes ?? null,
        }
      : {}),
    isLoginConfigIdValid: configIdValid,
    metaConfigured: await isMetaConfiguredForUser(userId),
    dbConnectionExists: !!connection,
    connectionStatus: connection?.status ?? "disconnected",
    lastSuccessfulConnection: connection?.connectedAt?.toISOString() ?? null,
    lastCallbackAttempt: lastCallbackLog?.createdAt.toISOString() ?? null,
    lastOAuthError: lastOAuthError?.safeMessage ?? connection?.lastError ?? null,
    lastOAuthErrorCode: lastOAuthError?.reason ?? connection?.lastErrorCode ?? null,
    lastSyncError:
      lastSyncErrorLog?.action === "facebook.oauth.sync_finished"
        ? lastSyncErrorLog.message
        : null,
    pagesReturnedCount: pagesCount,
    businessesReturnedCount: businessesCount,
  });
}
