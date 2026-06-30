import { z } from "zod";
import { requireAuth, checkRateLimit, apiSuccess, apiError, requireCsrf } from "@/lib/api-helpers";
import {
  getTelegramTemplateSettings,
  saveTelegramTemplateSettings,
  mapTelegramConnectionPublic,
} from "@/services/telegram.service";
import { prisma } from "@/lib/prisma";
import {
  parseTelegramTemplateSettings,
  type TelegramTemplateId,
} from "@/lib/telegram-template-settings";

const settingsSchema = z.object({
  templateId: z.enum(["classic", "business", "sales", "compact", "premium", "emoji"]).optional(),
  fields: z.record(z.boolean()).optional(),
  inlineButtons: z.record(z.boolean()).optional(),
  styling: z
    .object({
      useEmoji: z.boolean(),
      minimal: z.boolean(),
      dividers: z.boolean(),
      emptyLines: z.boolean(),
    })
    .optional(),
  signature: z.enum(["leadbridge", "none"]).optional(),
});

export async function GET() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const conn = await prisma.telegramConnection.findUnique({
    where: { userId: authResult.session.user.id },
  });

  if (!conn) {
    return apiSuccess({
      connected: false,
      settings: parseTelegramTemplateSettings(null),
    });
  }

  const settings = await getTelegramTemplateSettings(authResult.session.user.id);

  return apiSuccess({
    connected: conn.status === "connected",
    settings,
    connection: mapTelegramConnectionPublic(conn),
  });
}

export async function PATCH(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION", "Invalid template settings");
  }

  try {
    const current = await getTelegramTemplateSettings(authResult.session.user.id);
    const next = parseTelegramTemplateSettings({
      ...current,
      ...parsed.data,
      templateId: (parsed.data.templateId ?? current.templateId) as TelegramTemplateId,
      fields: { ...current.fields, ...(parsed.data.fields ?? {}) },
      inlineButtons: {
        ...current.inlineButtons,
        ...(parsed.data.inlineButtons ?? {}),
      },
      styling: { ...current.styling, ...(parsed.data.styling ?? {}) },
    });

    await saveTelegramTemplateSettings(authResult.session.user.id, next);
    return apiSuccess({ settings: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return apiError("SAVE_FAILED", message, 400);
  }
}
