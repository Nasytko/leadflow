import { getAppUrl, getRedirectUri, getWebhookUrl } from "@/lib/env";
import { buildOAuthUrlPreview } from "@/services/facebook-auth.service";
import {
  getAdminPlatformMetaStatus,
  cleanupLegacyMetaSettingsInDb,
} from "@/services/integration-settings.service";
import { requireAuth, apiSuccess, apiError, requireCsrf } from "@/lib/api-helpers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: apiError("UNAUTHORIZED", "Unauthorized", 401) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    return { error: apiError("FORBIDDEN", "Admin only", 403) };
  }

  return { session };
}

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin && admin.error) return admin.error;

  const status = await getAdminPlatformMetaStatus(admin.session!.user!.id);
  const oauthPreview = await buildOAuthUrlPreview(admin.session!.user!.id);

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
  if ("error" in admin && admin.error) return admin.error;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const result = await cleanupLegacyMetaSettingsInDb();
  return apiSuccess({ cleaned: true, ...result });
}
