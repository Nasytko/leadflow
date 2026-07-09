export type MetaUserError = {
  code: string;
  userMessageKey: string;
  adminMessageKey: string;
  severity: "error" | "warning";
};

const ERROR_MAP: Record<string, MetaUserError> = {
  invalid_app_secret: {
    code: "invalid_app_secret",
    userMessageKey: "invalid_app_secret.user",
    adminMessageKey: "invalid_app_secret.admin",
    severity: "error",
  },
  invalid_client_secret: {
    code: "invalid_app_secret",
    userMessageKey: "invalid_app_secret.user",
    adminMessageKey: "invalid_app_secret.admin",
    severity: "error",
  },
  missing_permissions: {
    code: "missing_permissions",
    userMessageKey: "missing_permissions.user",
    adminMessageKey: "missing_permissions.admin",
    severity: "warning",
  },
  no_pages: {
    code: "no_pages",
    userMessageKey: "no_pages.user",
    adminMessageKey: "no_pages.admin",
    severity: "warning",
  },
  no_ad_accounts: {
    code: "no_ad_accounts",
    userMessageKey: "no_ad_accounts.user",
    adminMessageKey: "no_ad_accounts.admin",
    severity: "warning",
  },
  webhook_not_verified: {
    code: "webhook_not_verified",
    userMessageKey: "webhook_not_verified.user",
    adminMessageKey: "webhook_not_verified.admin",
    severity: "warning",
  },
  invalid_state: {
    code: "invalid_state",
    userMessageKey: "invalid_state.user",
    adminMessageKey: "invalid_state.admin",
    severity: "warning",
  },
  token_exchange_failed: {
    code: "token_exchange_failed",
    userMessageKey: "token_exchange_failed.user",
    adminMessageKey: "token_exchange_failed.admin",
    severity: "error",
  },
  redirect_uri_mismatch: {
    code: "redirect_uri_mismatch",
    userMessageKey: "redirect_uri_mismatch.user",
    adminMessageKey: "redirect_uri_mismatch.admin",
    severity: "error",
  },
  oauth_exception: {
    code: "oauth_exception",
    userMessageKey: "oauth_exception.user",
    adminMessageKey: "oauth_exception.admin",
    severity: "error",
  },
  oauth_failed: {
    code: "oauth_failed",
    userMessageKey: "oauth_failed.user",
    adminMessageKey: "oauth_failed.admin",
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
    userMessageKey: "unknown.user",
    adminMessageKey: "unknown.admin",
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
