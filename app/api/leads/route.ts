import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess, apiError, requireCsrf } from "@/lib/api-helpers";
import { enqueueImportLeads } from "@/lib/queue";
import { importLeadsForUser } from "@/services/lead.service";
import { InvalidFacebookTokenError } from "@/services/facebook.service";
import { mapLeadPublic } from "@/lib/lead-mapper";

const importSchema = z.object({
  sendToTelegram: z.boolean().default(false),
  async: z.boolean().default(true),
});

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

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json();
  const parsed = importSchema.safeParse(body);
  const sendToTelegram = parsed.success ? parsed.data.sendToTelegram : false;
  const useAsync = parsed.success ? parsed.data.async : true;

  const fbConn = await prisma.facebookConnection.findUnique({
    where: { userId: authResult.session.user.id },
  });

  if (!fbConn || (fbConn.status !== "connected" && fbConn.status !== "pending_pages")) {
    return apiError(
      "FACEBOOK_NOT_CONNECTED",
      fbConn?.lastError ?? "Facebook is not connected or token is invalid",
      400
    );
  }

  try {
    if (useAsync) {
      await enqueueImportLeads({
        userId: authResult.session.user.id,
        sendToTelegram,
      });
      return apiSuccess({ queued: true, message: "Import started in background" });
    }

    const result = await importLeadsForUser(
      authResult.session.user.id,
      sendToTelegram
    );
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof InvalidFacebookTokenError) {
      return apiError("INVALID_FACEBOOK_TOKEN", error.message, 401);
    }
    const message = error instanceof Error ? error.message : "Import failed";
    return apiError("IMPORT_FAILED", message, 500);
  }
}
