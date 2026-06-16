import { requireAuth, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";
import {
  checkFacebookConnection,
  InvalidFacebookTokenError,
  mapFacebookConnectionPublic,
} from "@/services/facebook.service";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const userId = authResult.session.user.id;

  try {
    const result = await checkFacebookConnection(userId);

    if (!result.ok) {
      const conn = await prisma.facebookConnection.findUnique({ where: { userId } });
      return apiSuccess({
        ok: false,
        facebook: conn
          ? mapFacebookConnectionPublic(conn)
          : { status: result.status, lastError: result.lastError },
      });
    }

    await createAuditLog({
      userId,
      action: "facebook.check",
      ipAddress: getClientIp(request),
    });

    return apiSuccess({
      ok: true,
      facebook: mapFacebookConnectionPublic(result.connection),
    });
  } catch (error) {
    if (error instanceof InvalidFacebookTokenError) {
      return apiError("INVALID_FACEBOOK_TOKEN", error.message, 401);
    }
    const message = error instanceof Error ? error.message : "Check failed";
    return apiError("CHECK_FAILED", message, 500);
  }
}
