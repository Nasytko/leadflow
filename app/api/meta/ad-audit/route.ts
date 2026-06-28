import { requireAuth, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";
import { runAdAudit, type AdAuditPeriod } from "@/services/meta-ads.service";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const userId = authResult.session.user.id;
  const { searchParams } = new URL(request.url);
  const adAccountId = searchParams.get("adAccountId");
  const period = (searchParams.get("period") ?? "last_7d") as AdAuditPeriod;
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;

  if (!adAccountId) {
    return apiError("MISSING_AD_ACCOUNT", "adAccountId is required", 400);
  }

  const owned = await prisma.metaAdAccount.findFirst({
    where: { id: adAccountId, userId },
  });
  if (!owned) {
    return apiError("NOT_FOUND", "Ad account not found", 404);
  }

  try {
    const audit = await runAdAudit(userId, adAccountId, {
      period,
      dateFrom,
      dateTo,
    });
    return apiSuccess(audit);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audit failed";
    return apiError("AUDIT_FAILED", message, 400);
  }
}
