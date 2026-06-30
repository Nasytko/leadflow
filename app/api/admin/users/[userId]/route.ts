import { requireAdmin, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";
import { getUserAdminDetail } from "@/services/admin/admin-logs.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rateLimitError = await checkRateLimit(request, auth.session.user.id);
  if (rateLimitError) return rateLimitError;

  const { userId } = await params;
  const user = await getUserAdminDetail(userId);
  if (!user) return apiError("NOT_FOUND", "User not found", 404);
  return apiSuccess({ user });
}
