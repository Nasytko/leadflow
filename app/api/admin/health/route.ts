import { requireAdmin, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import { runPlatformHealthChecks } from "@/services/admin/admin-platform-health.service";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rateLimitError = await checkRateLimit(request, auth.session.user.id);
  if (rateLimitError) return rateLimitError;
  const result = await runPlatformHealthChecks();
  return apiSuccess(result);
}
