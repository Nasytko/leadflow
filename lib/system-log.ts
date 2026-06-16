import { prisma } from "@/lib/prisma";

export type SystemLogLevel = "info" | "warn" | "error";
export type SystemLogSource =
  | "facebook"
  | "telegram"
  | "webhook"
  | "lead"
  | "system"
  | "meta";

export async function writeSystemLog(params: {
  userId?: string | null;
  level: SystemLogLevel;
  source: SystemLogSource;
  action: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const { userId, level, source, action, message, metadata = {} } = params;

  const safeMeta = JSON.parse(
    JSON.stringify(metadata, (_key, value) => {
      if (typeof value === "string") {
        const lower = value.toLowerCase();
        if (
          lower.includes("token") ||
          lower.includes("secret") ||
          lower.includes("password")
        ) {
          return "[redacted]";
        }
      }
      return value;
    })
  ) as Record<string, unknown>;

  console.log(
    JSON.stringify({
      level,
      source,
      action,
      userId: userId ?? null,
      message,
      ...safeMeta,
    })
  );

  try {
    await prisma.systemLog.create({
      data: {
        userId: userId ?? undefined,
        level,
        source,
        action,
        message,
        metadata: safeMeta as object,
      },
    });
  } catch {
    // logging must not break main flow
  }
}

export function maskSecret(value: string | null | undefined, visible = 4): string {
  if (!value) return "";
  if (value.length <= visible * 2) return "***";
  return `${value.slice(0, visible)}…${value.slice(-visible)}`;
}
