import { requireAuth, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import { runMetaHealthReport } from "@/services/meta-health.service";

/** @deprecated Use GET /api/meta/health */
export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const report = await runMetaHealthReport(authResult.session.user.id, {
    isAdmin: authResult.session.user.isAdmin === true,
    liveTest: request.url.includes("live=1"),
  });

  return apiSuccess(report);
}
