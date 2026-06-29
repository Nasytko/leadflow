import { getAppUrl, getRedirectUri, getWebhookUrl } from "@/lib/env";
import { getPlatformLoginConfigStatus } from "@/services/integration-settings.service";
import { buildOAuthUrlPreview } from "@/services/facebook-auth.service";
import { requireAuth, apiSuccess, apiError } from "@/lib/api-helpers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("UNAUTHORIZED", "Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    return apiError("FORBIDDEN", "Admin only", 403);
  }

  const platformConfig = getPlatformLoginConfigStatus();
  const oauthPreview = await buildOAuthUrlPreview(session.user.id);

  return apiSuccess({
    metaAppId: process.env.META_APP_ID?.trim() ?? "",
    metaAppSecretConfigured: !!(process.env.META_APP_SECRET?.trim()),
    metaLoginConfigId: platformConfig.configId,
    metaLoginConfigIdValid: platformConfig.configIdValid,
    webhookVerifyTokenConfigured: !!(process.env.META_WEBHOOK_VERIFY_TOKEN?.trim()),
    redirectUri: getRedirectUri(),
    webhookUrl: getWebhookUrl(),
    nextAuthUrl: getAppUrl(),
    oauthUrl: oauthPreview?.oauthUrl ?? null,
    oauthUrlValid: !!oauthPreview?.oauthUrl,
  });
}
