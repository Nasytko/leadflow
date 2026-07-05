export type ApiErrorPayload = {
  code?: string;
  message?: string;
};

export type ConnectionErrorDomain = "facebook" | "telegram" | "generic";

/**
 * Maps API error payloads to human-readable messages via i18n `t` function.
 * Pass a scoped translator, e.g. `useTranslations("connections.facebook.overview")`.
 */
export function mapConnectionApiError(
  error: ApiErrorPayload | null | undefined,
  domain: ConnectionErrorDomain,
  t: (key: string) => string
): string {
  if (!error) {
    return domain === "facebook" ? t("syncFailed") : t("errors.generic");
  }

  const code = error.code ?? "";
  if (code === "CSRF_INVALID") return t("errors.sessionExpired");

  if (domain === "facebook") {
    if (code === "INVALID_FACEBOOK_TOKEN") return t("errors.tokenInvalid");
    if (code === "META_RATE_LIMIT") return t("errors.rateLimit");
    if (code === "META_TIMEOUT" || code === "META_NETWORK") return t("errors.network");
    if (code === "META_PERMISSION") return t("errors.permission");
  }

  if (domain === "telegram") {
    if (code === "TELEGRAM_FORBIDDEN") return t("errors.forbidden");
    if (code === "TELEGRAM_CHAT_NOT_FOUND") return t("errors.chatNotFound");
  }

  if (error.message) return error.message;
  return domain === "facebook" ? t("syncFailed") : t("errors.generic");
}

/** @deprecated Use mapConnectionApiError — kept for Epic 8 imports */
export function mapFacebookSyncErrorMessage(
  error: ApiErrorPayload | null | undefined,
  t: (key: string) => string
): string {
  return mapConnectionApiError(error, "facebook", t);
}
