import { requireAuth, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";
import {
  syncUserAdAccounts,
  mapMetaAdAccountPublic,
} from "@/services/meta-ads.service";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const userId = authResult.session.user.id;
  const accounts = await prisma.metaAdAccount.findMany({
    where: { userId },
    include: { business: { select: { name: true, businessId: true } } },
    orderBy: { name: "asc" },
  });

  return apiSuccess({
    accounts: accounts.map(mapMetaAdAccountPublic),
    count: accounts.length,
  });
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  try {
    const result = await syncUserAdAccounts(authResult.session.user.id);
    const accounts = await prisma.metaAdAccount.findMany({
      where: { userId: authResult.session.user.id },
      include: { business: { select: { name: true, businessId: true } } },
      orderBy: { name: "asc" },
    });
    return apiSuccess({
      synced: result.synced,
      accounts: accounts.map(mapMetaAdAccountPublic),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return apiError("SYNC_FAILED", message, 400);
  }
}
