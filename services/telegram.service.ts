import { decrypt, encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

const TELEGRAM_API = "https://api.telegram.org/bot";

export async function getTelegramBotInfo(botToken: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const data = await res.json();
  if (!data.ok) {
    return {
      ok: false as const,
      error: data.description ?? "getMe failed",
      errorCode: data.error_code != null ? String(data.error_code) : undefined,
    };
  }
  return {
    ok: true as const,
    username: data.result.username as string,
    firstName: data.result.first_name as string,
  };
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; messageId?: number; error?: string; errorCode?: string }> {
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
    return {
      ok: false,
      error: data.description ?? "Unknown error",
      errorCode: data.error_code != null ? String(data.error_code) : undefined,
    };
  }
  return { ok: true, messageId: data.result.message_id };
}

export async function validateTelegramConnection(
  botToken: string,
  chatId: string
): Promise<{ valid: boolean; error?: string; errorCode?: string }> {
  const result = await sendTelegramMessage(
    botToken,
    chatId,
    "✅ LeadFlow connection test"
  );
  return {
    valid: result.ok,
    error: result.error,
    errorCode: result.errorCode,
  };
}

async function setTelegramConnectionSuccess(userId: string) {
  await prisma.telegramConnection.updateMany({
    where: { userId },
    data: {
      status: "connected",
      verified: true,
      lastError: null,
      lastErrorAt: null,
      lastCheckedAt: new Date(),
    },
  });
}

async function setTelegramConnectionError(
  userId: string,
  message: string
) {
  await prisma.telegramConnection.updateMany({
    where: { userId },
    data: {
      status: "error",
      verified: false,
      lastError: message,
      lastErrorAt: new Date(),
    },
  });
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
    status: conn.status,
    lastError: conn.lastError,
    lastErrorAt: conn.lastErrorAt,
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

  const conn = await prisma.telegramConnection.upsert({
    where: { userId },
    create: {
      userId,
      botTokenEncrypted: encrypt(botToken),
      chatId,
      notificationLocale,
      verified: validation.valid,
      status: validation.valid ? "connected" : "error",
      lastError: validation.valid ? null : validation.error ?? "Connection failed",
      lastErrorAt: validation.valid ? null : new Date(),
    },
    update: {
      botTokenEncrypted: encrypt(botToken),
      chatId,
      notificationLocale,
      verified: validation.valid,
      status: validation.valid ? "connected" : "error",
      lastError: validation.valid ? null : validation.error ?? "Connection failed",
      lastErrorAt: validation.valid ? null : new Date(),
    },
  });

  if (!validation.valid) {
    throw new Error(validation.error ?? "Telegram connection failed");
  }

  return conn;
}

export async function testTelegramConnection(userId: string, message?: string) {
  const conn = await getTelegramConnection(userId);
  if (!conn) {
    return { ok: false as const, error: "Telegram not connected" };
  }

  const botInfo = await getTelegramBotInfo(conn.botToken);
  if (!botInfo.ok) {
    await setTelegramConnectionError(userId, botInfo.error ?? "Invalid bot token");
    return { ok: false as const, error: botInfo.error, errorCode: botInfo.errorCode };
  }

  const testMessage = message ?? "✅ LeadFlow — test message";
  const result = await sendTelegramMessage(conn.botToken, conn.chatId, testMessage);

  if (result.ok) {
    await setTelegramConnectionSuccess(userId);
    return { ok: true as const, botUsername: botInfo.username };
  }

  await setTelegramConnectionError(userId, result.error ?? "Failed to send message");
  return { ok: false as const, error: result.error, errorCode: result.errorCode };
}

export function mapTelegramConnectionPublic(conn: {
  chatId: string;
  notificationLocale: string;
  verified: boolean;
  status: string;
  lastError: string | null;
  lastErrorAt: Date | null;
  lastCheckedAt?: Date | null;
}) {
  return {
    connected: conn.status === "connected",
    chatId: conn.chatId,
    notificationLocale: conn.notificationLocale,
    verified: conn.verified,
    status: conn.status,
    lastError: conn.lastError,
    lastErrorAt: conn.lastErrorAt,
    lastCheckedAt: conn.lastCheckedAt ?? null,
  };
}
