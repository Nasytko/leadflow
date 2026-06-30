import { getAppUrl, getRedirectUri, getWebhookUrl } from "@/lib/env";
import { buildOAuthUrlPreview } from "@/services/facebook-auth.service";
import {
  getAdminPlatformMetaStatus,
  cleanupLegacyMetaSettingsInDb,
} from "@/services/integration-settings.service";
import { requireAdmin, apiSuccess, requireCsrf } from "@/lib/api-helpers";
import { logAdminAction } from "@/lib/admin-auth";

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const status = await getAdminPlatformMetaStatus(admin.session.user.id);
  const oauthPreview = await buildOAuthUrlPreview(admin.session.user.id);

  return apiSuccess({
    ...status,
    redirectUri: getRedirectUri(),
    webhookUrl: getWebhookUrl(),
    nextAuthUrl: getAppUrl(),
    oauthUrl: oauthPreview?.oauthUrl ?? null,
    oauthUrlValid: !!oauthPreview?.oauthUrl,
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const result = await cleanupLegacyMetaSettingsInDb();
  await logAdminAction({
    adminUserId: admin.session.user.id,
    action: "meta_cleanup_run",
    metadata: result,
    request,
  });
  return apiSuccess({ cleaned: true, ...result });
}
