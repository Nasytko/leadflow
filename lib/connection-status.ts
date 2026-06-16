export const FACEBOOK_STATUSES = [
  "disconnected",
  "connected",
  "invalid",
  "expired",
  "error",
] as const;

export const TELEGRAM_STATUSES = ["disconnected", "connected", "error"] as const;

export const SYNC_STATUSES = ["pending", "success", "failed"] as const;

export type FacebookStatus = (typeof FACEBOOK_STATUSES)[number];
export type TelegramStatus = (typeof TELEGRAM_STATUSES)[number];
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export function facebookStatusBadgeVariant(
  status: string
): "success" | "destructive" | "secondary" | "warning" {
  if (status === "connected") return "success";
  if (status === "invalid" || status === "expired" || status === "error") {
    return "destructive";
  }
  return "secondary";
}

export function telegramStatusBadgeVariant(
  status: string
): "success" | "destructive" | "secondary" {
  if (status === "connected") return "success";
  if (status === "error") return "destructive";
  return "secondary";
}

export function isFacebookOperational(status: string): boolean {
  return status === "connected";
}

export function isTelegramOperational(status: string): boolean {
  return status === "connected";
}
