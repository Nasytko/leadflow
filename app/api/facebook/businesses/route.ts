import { requireAuth, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import {
  mapFacebookBusinessPublic,
  syncFacebookIdentity,
} from "@/services/facebook.service";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const userId = authResult.session.user.id;
  const businesses = await prisma.facebookBusiness.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  return apiSuccess({
    businesses: businesses.map(mapFacebookBusinessPublic),
    count: businesses.length,
  });
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const userId = authResult.session.user.id;
  const result = await syncFacebookIdentity(userId);

  return apiSuccess({
    businesses: result.businesses.map(mapFacebookBusinessPublic),
    businessesCount: result.businessesCount,
    pagesCount: result.pagesCount,
  });
}
