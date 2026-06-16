import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import { enqueueImportLeads } from "@/lib/queue";

const importSchema = z.object({
  sendToTelegram: z.boolean().default(false),
});

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status");
  const formId = searchParams.get("formId");

  const where: Record<string, unknown> = {
    userId: authResult.session.user.id,
  };

  if (status) where.status = status;
  if (formId) where.formId = formId;
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
      include: { form: { select: { formName: true } } },
      orderBy: { createdTime: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return apiSuccess({
    items: items.map((l) => ({
      id: l.id,
      leadgenId: l.leadgenId,
      name: l.name,
      phone: l.phone,
      email: l.email,
      status: l.status,
      createdTime: l.createdTime,
      formName: l.form?.formName,
      fieldData: l.fieldData,
      rawData: l.rawData,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const body = await request.json();
  const parsed = importSchema.safeParse(body);

  await enqueueImportLeads({
    userId: authResult.session.user.id,
    sendToTelegram: parsed.success ? parsed.data.sendToTelegram : false,
  });

  return apiSuccess({ queued: true });
}
