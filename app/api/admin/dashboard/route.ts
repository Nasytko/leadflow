import { requireAdmin, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import { getAdminDashboardStats } from "@/services/admin/admin-dashboard.service";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rateLimitError = await checkRateLimit(request, auth.session.user.id);
  if (rateLimitError) return rateLimitError;
  const data = await getAdminDashboardStats();
  return apiSuccess(data);
}
