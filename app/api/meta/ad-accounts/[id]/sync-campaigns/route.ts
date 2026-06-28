import { requireAuth, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";
import { syncAdAccountCampaigns } from "@/services/meta-ads.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const { id } = await params;

  try {
    const result = await syncAdAccountCampaigns(authResult.session.user.id, id);
    return apiSuccess(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return apiError("SYNC_FAILED", message, 400);
  }
}
