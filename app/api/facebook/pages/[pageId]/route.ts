import { requireAuth, checkRateLimit, apiSuccess, apiError, requireCsrf } from "@/lib/api-helpers";
import { connectPage, disconnectPage, InvalidFacebookTokenError } from "@/services/facebook.service";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const { pageId } = await params;

  try {
    const page = await connectPage(authResult.session.user.id, pageId);
    await createAuditLog({
      userId: authResult.session.user.id,
      action: "facebook.page.connect",
      resource: pageId,
      ipAddress: getClientIp(request),
    });
    return apiSuccess({ page });
  } catch (error) {
    if (error instanceof InvalidFacebookTokenError) {
      return apiError("INVALID_FACEBOOK_TOKEN", error.message, 401);
    }
    const message = error instanceof Error ? error.message : "Connect failed";
    return apiError("CONNECT_FAILED", message, 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const { pageId } = await params;

  await disconnectPage(authResult.session.user.id, pageId);
  await createAuditLog({
    userId: authResult.session.user.id,
    action: "facebook.page.disconnect",
    resource: pageId,
    ipAddress: getClientIp(request),
  });

  return apiSuccess({ disconnected: true });
}
