import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import { mapLeadPublic } from "@/lib/lead-mapper";
import { handleLeadImportRequest } from "@/lib/lead-import-api";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const search = searchParams.get("search") ?? "";
  const crmStatus = searchParams.get("crmStatus") ?? searchParams.get("status");
  const formId = searchParams.get("formId");
  const source = searchParams.get("source");
  const pageId = searchParams.get("pageId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const telegramStatus = searchParams.get("telegramStatus");

  const where: Record<string, unknown> = {
    userId: authResult.session.user.id,
  };

  if (crmStatus) where.crmStatus = crmStatus;
  if (formId) where.formId = formId;
  if (source) where.source = source;
  if (telegramStatus) where.telegramStatus = telegramStatus;
  if (pageId) where.form = { pageId };
  if (dateFrom || dateTo) {
    const createdTime: Record<string, Date> = {};
    if (dateFrom) createdTime.gte = new Date(dateFrom);
    if (dateTo) createdTime.lte = new Date(dateTo);
    where.createdTime = createdTime;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        form: {
          include: { page: { include: { business: true } } },
        },
      },
      orderBy: { createdTime: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return apiSuccess({
    items: items.map(mapLeadPublic),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

/** @deprecated Prefer POST /api/meta/leads/import */
export async function POST(request: Request) {
  return handleLeadImportRequest(request);
}
