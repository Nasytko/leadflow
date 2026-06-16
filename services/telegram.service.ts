import { decrypt, encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

const TELEGRAM_API = "https://api.telegram.org/bot";

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const res = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    return { ok: false, error: data.description ?? "Unknown error" };
  }
  return { ok: true, messageId: data.result.message_id };
}

export async function validateTelegramConnection(
  botToken: string,
  chatId: string
): Promise<{ valid: boolean; error?: string }> {
  const result = await sendTelegramMessage(
    botToken,
    chatId,
    "✅ LeadFlow connection test"
  );
  return { valid: result.ok, error: result.error };
}

export async function getTelegramConnection(userId: string) {
  const conn = await prisma.telegramConnection.findUnique({
    where: { userId },
  });
  if (!conn) return null;

  return {
    id: conn.id,
    chatId: conn.chatId,
    notificationLocale: conn.notificationLocale,
    verified: conn.verified,
    botToken: decrypt(conn.botTokenEncrypted),
  };
}

export async function saveTelegramConnection(
  userId: string,
  botToken: string,
  chatId: string,
  notificationLocale: string
) {
  const validation = await validateTelegramConnection(botToken, chatId);

  return prisma.telegramConnection.upsert({
    where: { userId },
    create: {
      userId,
      botTokenEncrypted: encrypt(botToken),
      chatId,
      notificationLocale,
      verified: validation.valid,
    },
    update: {
      botTokenEncrypted: encrypt(botToken),
      chatId,
      notificationLocale,
      verified: validation.valid,
    },
  });
}
