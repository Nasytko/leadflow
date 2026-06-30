import { requireAdmin, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import { getAdminSecurityStats } from "@/services/admin/admin-logs.service";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rateLimitError = await checkRateLimit(request, auth.session.user.id);
  if (rateLimitError) return rateLimitError;
  return apiSuccess(await getAdminSecurityStats());
}
