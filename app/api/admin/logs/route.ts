import { requireAdmin, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import { querySystemLogs } from "@/services/admin/admin-logs.service";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rateLimitError = await checkRateLimit(request, auth.session.user.id);
  if (rateLimitError) return rateLimitError;

  const { searchParams } = new URL(request.url);
  const logs = await querySystemLogs({
    level: searchParams.get("level") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    limit: parseInt(searchParams.get("limit") ?? "100", 10),
    offset: parseInt(searchParams.get("offset") ?? "0", 10),
  });

  return apiSuccess({ logs });
}
