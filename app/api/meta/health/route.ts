import { requireAuth, checkRateLimit, apiSuccess, apiError, requireCsrf } from "@/lib/api-helpers";
import { runMetaHealthReport } from "@/services/meta-health.service";
import { syncUserForms, syncUserPages } from "@/services/facebook.service";
import { syncUserAdAccounts } from "@/services/meta-ads.service";
import { testTelegramConnection } from "@/services/telegram.service";
import { buildOAuthUrlPreview } from "@/services/facebook-auth.service";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const { searchParams } = new URL(request.url);
  const live = searchParams.get("live") === "1";

  const report = await runMetaHealthReport(authResult.session.user.id, {
    isAdmin: authResult.session.user.isAdmin === true,
    liveTest: live,
  });

  return apiSuccess(report);
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const userId = authResult.session.user.id;
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "full_test";

  try {
    switch (action) {
      case "sync_pages":
        await syncUserPages(userId);
        break;
      case "sync_forms":
        await syncUserForms(userId);
        break;
      case "sync_ad_accounts":
        await syncUserAdAccounts(userId);
        break;
      case "test_telegram":
        await testTelegramConnection(userId);
        break;
      case "reconnect": {
        const preview = await buildOAuthUrlPreview(userId);
        return apiSuccess({ redirectUrl: preview?.oauthUrl ?? null });
      }
      case "full_test":
      default:
        break;
    }

    const report = await runMetaHealthReport(userId, {
      isAdmin: authResult.session.user.isAdmin === true,
      liveTest: true,
    });

    return apiSuccess({ ...report, action });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health action failed";
    return apiError("HEALTH_ACTION_FAILED", message, 500);
  }
}
