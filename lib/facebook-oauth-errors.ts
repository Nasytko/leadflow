/** Map Meta OAuth / token exchange errors to stable client-facing codes. */
export function classifyFacebookOAuthError(message: string): {
  code: string;
  message: string;
} {
  const lower = message.toLowerCase();

  if (lower.includes("configuration id") || lower.includes("config_id")) {
    return {
      code: "invalid_config_id",
      message:
        "Invalid Facebook Login Configuration ID. Use a numeric Meta config ID (5–20 digits), not email or free text.",
    };
  }
  if (lower.includes("redirect_uri") || lower.includes("redirect uri")) {
    return {
      code: "redirect_uri_mismatch",
      message:
        "OAuth redirect URI mismatch. Ensure Meta Valid OAuth Redirect URIs matches your app callback URL exactly.",
    };
  }
  if (
    lower.includes("client_secret") ||
    lower.includes("app secret") ||
    lower.includes("error validating client secret")
  ) {
    return {
      code: "invalid_client_secret",
      message: "Invalid Meta App Secret. Check META_APP_SECRET in environment or settings.",
    };
  }
  if (lower.includes("code") && lower.includes("expired")) {
    return {
      code: "missing_code",
      message: "Authorization code expired or missing. Please connect Facebook again.",
    };
  }
  if (lower.includes("permission") || lower.includes("scope")) {
    return {
      code: "missing_permissions",
      message:
        "Required Facebook permissions were not granted. Reconnect and approve all Lead Ads permissions.",
    };
  }
  if (
    lower.includes("token exchange") ||
    lower.includes("access_token") ||
    lower.includes("oauth/access_token")
  ) {
    return {
      code: "token_exchange_failed",
      message: message.slice(0, 500),
    };
  }

  return {
    code: "oauth_failed",
    message: message.slice(0, 500),
  };
}
