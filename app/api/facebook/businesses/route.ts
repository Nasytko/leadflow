import { requireAuth, checkRateLimit, apiSuccess, requireCsrf, apiError } from "@/lib/api-helpers";
import {
  mapFacebookBusinessPublic,
  syncFacebookIdentity,
} from "@/services/facebook.service";
import { MetaGraphError } from "@/lib/meta-graph-fetch";
import { leadImportUserMessage } from "@/lib/lead-import-errors";
import { prisma } from "@/lib/prisma";

async function getBusinessesWithCounts(userId: string) {
  const [businesses, pages] = await Promise.all([
    prisma.facebookBusiness.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    }),
    prisma.facebookPage.findMany({
      where: { userId },
      include: { forms: { select: { id: true } } },
    }),
  ]);

  return businesses.map((business) => {
    const businessPages = pages.filter((page) => page.businessId === business.id);
    const formsCount = businessPages.reduce(
      (sum, page) => sum + page.forms.length,
      0
    );
    return mapFacebookBusinessPublic(business, {
      pagesCount: businessPages.length,
      formsCount,
    });
  });
}

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const businesses = await getBusinessesWithCounts(authResult.session.user.id);

  return apiSuccess({
    businesses,
    count: businesses.length,
  });
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const userId = authResult.session.user.id;

  try {
    const result = await syncFacebookIdentity(userId);
    const businesses = await getBusinessesWithCounts(userId);

    return apiSuccess({
      businesses,
      businessesCount: result.businessesCount,
      pagesCount: result.pagesCount,
    });
  } catch (error) {
    if (error instanceof MetaGraphError) {
      return apiError(
        error.metaCode,
        leadImportUserMessage(error.metaCode, error.message),
        error.timeout || error.networkError ? 503 : 400
      );
    }
    const message = error instanceof Error ? error.message : "Sync failed";
    return apiError("SYNC_FAILED", message, 500);
  }
}
