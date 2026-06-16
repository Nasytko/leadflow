import { z } from "zod";
import { requireAuth, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";
import { getTelegramConnection, sendTelegramMessage } from "@/services/telegram.service";

const schema = z.object({
  message: z.string().optional(),
});

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const conn = await getTelegramConnection(authResult.session.user.id);
  if (!conn) {
    return apiError("NOT_CONNECTED", "Telegram not connected", 400);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const testMessage = parsed.success && parsed.data.message
    ? parsed.data.message
    : "✅ LeadFlow — test message";

  const result = await sendTelegramMessage(
    conn.botToken,
    conn.chatId,
    testMessage
  );

  if (!result.ok) {
    return apiError("SEND_FAILED", result.error ?? "Failed", 500);
  }

  return apiSuccess({ sent: true });
}
