import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, locale = "ru"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeAgo(date: Date | string | null | undefined, locale = "ru"): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return locale === "ru" ? "только что" : "just now";
  if (diffMin < 60) return locale === "ru" ? `${diffMin} мин назад` : `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return locale === "ru" ? `${diffHours} ч назад` : `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return locale === "ru" ? "вчера" : "yesterday";
  if (diffDays < 7) return locale === "ru" ? `${diffDays} дн назад` : `${diffDays}d ago`;
  return formatDate(d, locale);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
