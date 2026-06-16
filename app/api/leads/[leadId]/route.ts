import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const { leadId } = await params;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: authResult.session.user.id },
    include: {
      form: { select: { formName: true } },
      deliveryLogs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) {
    return apiError("NOT_FOUND", "Lead not found", 404);
  }

  return apiSuccess({ lead });
}
