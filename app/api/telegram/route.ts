import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";
import {
  saveTelegramConnection,
  mapTelegramConnectionPublic,
} from "@/services/telegram.service";

const schema = z.object({
  botToken: z.string().min(1),
  chatId: z.string().min(1),
  notificationLocale: z.enum(["ru", "en"]).default("ru"),
});

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const conn = await prisma.telegramConnection.findUnique({
    where: { userId: authResult.session.user.id },
  });

  if (!conn) {
    return apiSuccess({
      connected: false,
      status: "disconnected",
    });
  }

  return apiSuccess(mapTelegramConnectionPublic(conn));
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION", "Invalid input");
  }

  try {
    const conn = await saveTelegramConnection(
      authResult.session.user.id,
      parsed.data.botToken,
      parsed.data.chatId,
      parsed.data.notificationLocale
    );

    return apiSuccess(mapTelegramConnectionPublic(conn));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return apiError("SAVE_FAILED", message, 400);
  }
}
