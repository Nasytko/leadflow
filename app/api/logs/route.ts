import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  const deliveryWhere: Record<string, unknown> = {
    userId: authResult.session.user.id,
  };
  if (type) deliveryWhere.type = type;
  if (status) deliveryWhere.status = status;

  const [deliveryLogs, deliveryTotal, webhookEvents, webhookTotal] =
    await Promise.all([
      prisma.deliveryLog.findMany({
        where: deliveryWhere,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { lead: { select: { name: true, leadgenId: true } } },
      }),
      prisma.deliveryLog.count({ where: deliveryWhere }),
      prisma.webhookEvent.findMany({
        where: { userId: authResult.session.user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.webhookEvent.count({
        where: { userId: authResult.session.user.id },
      }),
    ]);

  return apiSuccess({
    deliveryLogs: deliveryLogs.map((l) => ({
      id: l.id,
      type: l.type,
      status: l.status,
      retryCount: l.retryCount,
      retryHistory: l.retryHistory,
      errorMessage: l.errorMessage,
      createdAt: l.createdAt,
      leadName: l.lead?.name,
      leadgenId: l.lead?.leadgenId,
    })),
    deliveryTotal,
    webhookEvents,
    webhookTotal,
    page,
    limit,
    totalPages: Math.ceil(deliveryTotal / limit),
  });
}
