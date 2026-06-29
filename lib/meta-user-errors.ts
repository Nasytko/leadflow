export type MetaUserError = {
  code: string;
  userMessageKey: string;
  adminMessageKey: string;
  severity: "error" | "warning";
};

const ERROR_MAP: Record<string, MetaUserError> = {
  invalid_app_secret: {
    code: "invalid_app_secret",
    userMessageKey: "errors.invalid_app_secret.user",
    adminMessageKey: "errors.invalid_app_secret.admin",
    severity: "error",
  },
  invalid_client_secret: {
    code: "invalid_app_secret",
    userMessageKey: "errors.invalid_app_secret.user",
    adminMessageKey: "errors.invalid_app_secret.admin",
    severity: "error",
  },
  missing_permissions: {
    code: "missing_permissions",
    userMessageKey: "errors.missing_permissions.user",
    adminMessageKey: "errors.missing_permissions.admin",
    severity: "warning",
  },
  no_pages: {
    code: "no_pages",
    userMessageKey: "errors.no_pages.user",
    adminMessageKey: "errors.no_pages.admin",
    severity: "warning",
  },
  no_ad_accounts: {
    code: "no_ad_accounts",
    userMessageKey: "errors.no_ad_accounts.user",
    adminMessageKey: "errors.no_ad_accounts.admin",
    severity: "warning",
  },
  webhook_not_verified: {
    code: "webhook_not_verified",
    userMessageKey: "errors.webhook_not_verified.user",
    adminMessageKey: "errors.webhook_not_verified.admin",
    severity: "warning",
  },
  invalid_state: {
    code: "invalid_state",
    userMessageKey: "errors.invalid_state.user",
    adminMessageKey: "errors.invalid_state.admin",
    severity: "warning",
  },
  token_exchange_failed: {
    code: "token_exchange_failed",
    userMessageKey: "errors.token_exchange_failed.user",
    adminMessageKey: "errors.token_exchange_failed.admin",
    severity: "error",
  },
  redirect_uri_mismatch: {
    code: "redirect_uri_mismatch",
    userMessageKey: "errors.redirect_uri_mismatch.user",
    adminMessageKey: "errors.redirect_uri_mismatch.admin",
    severity: "error",
  },
  oauth_exception: {
    code: "oauth_exception",
    userMessageKey: "errors.oauth_exception.user",
    adminMessageKey: "errors.oauth_exception.admin",
    severity: "error",
  },
  oauth_failed: {
    code: "oauth_failed",
    userMessageKey: "errors.oauth_failed.user",
    adminMessageKey: "errors.oauth_failed.admin",
    severity: "error",
  },
};

export function resolveMetaUserError(
  code: string | null | undefined,
  fallbackMessage?: string | null
): MetaUserError {
  if (code && ERROR_MAP[code]) return ERROR_MAP[code];
  return {
    code: code ?? "unknown",
    userMessageKey: "errors.unknown.user",
    adminMessageKey: "errors.unknown.admin",
    severity: "error",
  };
}

export function getMetaUserErrorMessage(
  code: string | null | undefined,
  isAdmin: boolean,
  t: (key: string) => string,
  adminDetail?: string | null
): string {
  const resolved = resolveMetaUserError(code);
  if (isAdmin) {
    return adminDetail ?? t(resolved.adminMessageKey);
  }
  return t(resolved.userMessageKey);
}
