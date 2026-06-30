import { requireAuth, checkRateLimit, apiSuccess, apiError, requireCsrf } from "@/lib/api-helpers";
import { getTelegramConnection, getTelegramTemplateSettings } from "@/services/telegram.service";
import { buildTelegramMessageWithButtons } from "@/services/notification.service";
import { sendTelegramMessage, buildTelegramInlineKeyboard } from "@/services/telegram.service";
import { SAMPLE_LEAD_CONTEXT } from "@/lib/telegram-template-renderer";
import { z } from "zod";
import { parseTelegramTemplateSettings } from "@/lib/telegram-template-settings";

const schema = z.object({
  settings: z.object({}).passthrough().optional(),
});

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  const conn = await getTelegramConnection(authResult.session.user.id);
  if (!conn) {
    return apiError("NOT_CONNECTED", "Telegram not connected", 400);
  }

  const saved = await getTelegramTemplateSettings(authResult.session.user.id);
  const settings = parsed.success && parsed.data.settings
    ? parseTelegramTemplateSettings({ ...saved, ...parsed.data.settings })
    : saved;

  const locale = (conn.notificationLocale as "ru" | "en") ?? "ru";
  const rendered = buildTelegramMessageWithButtons(locale, SAMPLE_LEAD_CONTEXT, settings);

  const result = await sendTelegramMessage(conn.botToken, conn.chatId, rendered.html, {
    inlineKeyboard: buildTelegramInlineKeyboard(rendered.inlineButtons),
  });

  if (!result.ok) {
    return apiError("SEND_FAILED", result.error ?? "Failed", 500);
  }

  return apiSuccess({ sent: true });
}
