import { requireAuth, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";
import { connectPage, disconnectPage } from "@/services/facebook.service";
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
