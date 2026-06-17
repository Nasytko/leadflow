import { requireAuth, checkRateLimit, apiSuccess, requireCsrf } from "@/lib/api-helpers";
import { resetFacebookConnection } from "@/services/facebook.service";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  await resetFacebookConnection(authResult.session.user.id);

  await createAuditLog({
    userId: authResult.session.user.id,
    action: "facebook.reset",
    ipAddress: getClientIp(request),
  });

  return apiSuccess({ reset: true });
}
