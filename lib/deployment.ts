function isPlaceholder(value?: string | null): boolean {
  if (!value) return true;
  return value.startsWith("your-");
}

/** Platform operator provides Meta credentials via environment (typical SaaS). */
export function isPlatformMetaManaged(): boolean {
  const appId = process.env.META_APP_ID;
  const secret = process.env.META_APP_SECRET;
  return !!(
    appId &&
    secret &&
    !isPlaceholder(appId) &&
    !isPlaceholder(secret)
  );
}

/**
 * Advanced Meta settings (App Secret, Webhook token, Login Config ID) are for
 * self-hosted installs. SaaS users connect via platform Meta App only.
 */
export function showAdvancedMetaSettings(): boolean {
  const mode = process.env.DEPLOYMENT_MODE?.toLowerCase();
  if (mode === "self_hosted") return true;
  if (mode === "saas") return false;
  if (process.env.SHOW_ADVANCED_META_SETTINGS === "true") return true;
  if (process.env.SHOW_ADVANCED_META_SETTINGS === "false") return false;
  return !isPlatformMetaManaged();
}
