import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  checkRateLimit,
  apiSuccess,
  apiError,
  requireCsrf,
} from "@/lib/api-helpers";
import { getFacebookOverview } from "@/services/facebook-overview.service";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const data = await getFacebookOverview(authResult.session.user.id);
  return apiSuccess(data);
}

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("setPrimaryBusiness"),
    businessId: z.string().min(1),
  }),
]);

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION", "Invalid input");
  }

  const userId = authResult.session.user.id;

  if (parsed.data.action === "setPrimaryBusiness") {
    const business = await prisma.facebookBusiness.findFirst({
      where: { userId, businessId: parsed.data.businessId },
    });
    if (!business) {
      return apiError("NOT_FOUND", "Business not found", 404);
    }

    await prisma.facebookConnection.updateMany({
      where: { userId },
      data: { primaryBusinessId: parsed.data.businessId },
    });

    const data = await getFacebookOverview(userId);
    return apiSuccess(data);
  }

  return apiError("VALIDATION", "Unknown action");
}
