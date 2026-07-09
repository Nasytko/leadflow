export type TelegramDiagnostic =
  | { kind: "token_invalid" }
  | { kind: "chat_not_found" }
  | { kind: "forbidden" }
  | { kind: "bot_not_started" }
  | { kind: "unknown" };

export function mapTelegramDiagnostic(message: string | null | undefined): TelegramDiagnostic {
  if (!message) return { kind: "unknown" };
  const m = message.toLowerCase();

  if (m.includes("unauthorized") || m.includes("invalid token") || m.includes("token is invalid")) {
    return { kind: "token_invalid" };
  }

  if (m.includes("chat not found") || m.includes("400") && m.includes("chat")) {
    return { kind: "chat_not_found" };
  }

  if (m.includes("403") || m.includes("forbidden")) {
    if (m.includes("bot can't send messages to the bot")) return { kind: "forbidden" };
    if (m.includes("not enough rights")) return { kind: "forbidden" };
    return { kind: "forbidden" };
  }

  if (m.includes("bot was blocked") || m.includes("blocked by the user") || m.includes("blocked")) {
    return { kind: "bot_not_started" };
  }

  return { kind: "unknown" };
}

