import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";
import {
  syncUserPages,
  resetFacebookConnection,
  InvalidFacebookTokenError,
} from "@/services/facebook.service";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const connection = await prisma.facebookConnection.findUnique({
    where: { userId: authResult.session.user.id },
  });

  const pages = await prisma.facebookPage.findMany({
    where: { userId: authResult.session.user.id },
    orderBy: { pageName: "asc" },
  });

  return apiSuccess({
    connected: !!connection && connection.status === "connected",
    status: connection?.status ?? "not_connected",
    pages: pages.map((p) => ({
      id: p.id,
      pageId: p.pageId,
      pageName: p.pageName,
      connected: p.connected,
      syncStatus: p.syncStatus,
      webhookStatus: p.webhookStatus,
      lastError: p.lastError,
    })),
  });
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  try {
    const pages = await syncUserPages(authResult.session.user.id);
    return apiSuccess({
      pages: pages.map((p) => ({
        id: p.id,
        pageId: p.pageId,
        pageName: p.pageName,
        connected: p.connected,
      })),
    });
  } catch (error) {
    if (error instanceof InvalidFacebookTokenError) {
      return apiError("INVALID_FACEBOOK_TOKEN", error.message, 401);
    }
    const message = error instanceof Error ? error.message : "Sync failed";
    return apiError("SYNC_FAILED", message, 500);
  }
}

export async function DELETE(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  await resetFacebookConnection(authResult.session.user.id);

  await createAuditLog({
    userId: authResult.session.user.id,
    action: "facebook.disconnect",
    ipAddress: getClientIp(request),
  });

  return apiSuccess({ disconnected: true });
}
