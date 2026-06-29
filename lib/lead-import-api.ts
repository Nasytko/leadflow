import { z } from "zod";
import { randomUUID } from "crypto";
import {
  requireAuth,
  checkRateLimit,
  apiSuccess,
  apiError,
  requireCsrf,
} from "@/lib/api-helpers";
import { enqueueImportLeads } from "@/lib/queue";
import { importMetaLeadsForUser } from "@/services/lead-import.service";
import {
  mapLeadImportError,
  leadImportUserMessage,
} from "@/lib/lead-import-errors";
import { prisma } from "@/lib/prisma";

const importSchema = z.object({
  sendToTelegram: z.boolean().default(false),
  sendImportedToTelegram: z.boolean().optional(),
  async: z.boolean().default(false),
});

function httpStatusForImportCode(code: string): number {
  switch (code) {
    case "INVALID_FACEBOOK_TOKEN":
      return 401;
    case "FACEBOOK_NOT_CONNECTED":
      return 400;
    case "META_RATE_LIMIT":
      return 429;
    case "META_TIMEOUT":
    case "META_NETWORK":
      return 503;
    case "META_PERMISSION":
    case "NO_ENABLED_FORMS":
    case "FORM_DISABLED":
    case "FORM_NOT_FOUND":
      return 400;
    default:
      return code === "IMPORT_UNEXPECTED" ? 500 : 400;
  }
}

export async function handleLeadImportRequest(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => ({}));
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION", "Invalid import request", 400);
  }

  const userId = authResult.session.user.id;
  const sendToTelegram =
    parsed.data.sendImportedToTelegram ?? parsed.data.sendToTelegram;
  const useAsync = parsed.data.async;
  const isAdmin = authResult.session.user.isAdmin === true;

  const fbConn = await prisma.facebookConnection.findUnique({
    where: { userId },
    select: { id: true, status: true, lastError: true },
  });

  if (
    !fbConn ||
    (fbConn.status !== "connected" && fbConn.status !== "pending_pages")
  ) {
    const payload = {
      success: false as const,
      code: "FACEBOOK_NOT_CONNECTED",
      stage: "validate" as const,
      message: leadImportUserMessage("FACEBOOK_NOT_CONNECTED"),
      ...(isAdmin
        ? { adminMessage: fbConn?.lastError ?? "Not connected" }
        : {}),
    };
    return apiSuccess(payload, 400);
  }

  if (useAsync) {
    try {
      await enqueueImportLeads({ userId, sendToTelegram });
      return apiSuccess({
        success: true,
        queued: true,
        imported: 0,
        duplicates: 0,
        failed: 0,
        formsProcessed: 0,
        telegramSent: 0,
        telegramFailed: 0,
        message: "Импорт запущен в фоне",
      });
    } catch (error) {
      const errorId = randomUUID();
      const mapped = mapLeadImportError(error, "unknown", errorId);
      const response = isAdmin
        ? mapped
        : {
            success: false as const,
            code: mapped.code,
            stage: mapped.stage,
            message: mapped.message,
            ...(mapped.errorId ? { errorId: mapped.errorId } : {}),
          };
      return apiSuccess(response, httpStatusForImportCode(mapped.code));
    }
  }

  const result = await importMetaLeadsForUser(userId, sendToTelegram);

  if (!result.success) {
    const response = isAdmin
      ? result
      : {
          success: false as const,
          code: result.code,
          stage: result.stage,
          message: result.message,
          ...(result.errorId ? { errorId: result.errorId } : {}),
        };
    return apiSuccess(response, httpStatusForImportCode(result.code));
  }

  return apiSuccess(result);
}
