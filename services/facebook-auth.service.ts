import {
  getMetaCredentials,
  getRedirectUri,
  getLoginConfigId,
} from "./integration-settings.service";
import {
  META_GRAPH_API_BASE,
  META_OAUTH_DIALOG_BASE,
} from "@/lib/facebook-graph-config";
import { writeSystemLog } from "@/lib/system-log";
import { isValidMetaLoginConfigId } from "@/lib/meta-login-config";

const GRAPH_API_BASE = META_GRAPH_API_BASE;

/** Scopes for Lead Ads + Business Manager page access */
export const FB_OAUTH_SCOPES = [
  "public_profile",
  "email",
  "pages_show_list",
  "pages_read_engagement",
  "leads_retrieval",
  "ads_read",
  "pages_manage_ads",
  "business_management",
] as const;

export const FB_SCOPES = FB_OAUTH_SCOPES.join(",");

export type DebugTokenResult = {
  isValid: boolean;
  appId?: string;
  userId?: string;
  scopes: string[];
  granularScopes: Array<{ scope: string; target_ids?: string[] }>;
  expiresAt?: number;
  error?: string;
};

export type FacebookOAuthUrlParts = {
  clientId: string;
  redirectUri: string;
  configId: string | null;
  scopes: string;
};

/** Build OAuth query params; config_id only when a valid Login Configuration ID is resolved. */
export function buildFacebookOAuthParams(
  parts: FacebookOAuthUrlParts & { state?: string }
): URLSearchParams {
  const params = new URLSearchParams({
    client_id: parts.clientId,
    redirect_uri: parts.redirectUri,
    response_type: "code",
    scope: parts.scopes,
  });

  if (parts.state) {
    params.set("state", parts.state);
  }

  if (parts.configId && isValidMetaLoginConfigId(parts.configId)) {
    params.set("config_id", parts.configId);
  }

  return params;
}

export function buildFacebookOAuthUrl(
  parts: FacebookOAuthUrlParts & { state?: string }
): string {
  return `${META_OAUTH_DIALOG_BASE}?${buildFacebookOAuthParams(parts)}`;
}

export async function getFacebookAuthUrl(
  userId: string,
  state: string
): Promise<string> {
  const creds = await getMetaCredentials(userId);
  if (!creds) {
    throw new Error("Meta App not configured");
  }

  const configId = await getLoginConfigId(userId);

  return buildFacebookOAuthUrl({
    clientId: creds.appId,
    redirectUri: getRedirectUri(),
    configId,
    scopes: FB_SCOPES,
    state,
  });
}

export type OAuthUrlPreview = {
  appId: string;
  redirectUri: string;
  scopes: string;
  configId: string | null;
  configIdPresent: boolean;
  configIdValid: boolean;
  oauthUrl: string;
  /** @deprecated use configId */
  loginConfigIdUsed: string | null;
  /** @deprecated use configIdValid */
  isLoginConfigIdValid: boolean;
  /** @deprecated use oauthUrl */
  oauthUrlPreview: string;
};

/** Build OAuth URL preview without state or secrets (for diagnostics). */
export async function buildOAuthUrlPreview(
  userId: string
): Promise<OAuthUrlPreview | null> {
  const creds = await getMetaCredentials(userId);
  if (!creds) return null;

  const redirectUri = getRedirectUri();
  const configId = await getLoginConfigId(userId);
  const configIdValid = configId ? isValidMetaLoginConfigId(configId) : false;
  const oauthUrl = buildFacebookOAuthUrl({
    clientId: creds.appId,
    redirectUri,
    configId,
    scopes: FB_SCOPES,
  });

  return {
    appId: creds.appId,
    redirectUri,
    scopes: FB_SCOPES,
    configId,
    configIdPresent: !!configId,
    configIdValid,
    oauthUrl,
    loginConfigIdUsed: configId,
    isLoginConfigIdValid: configIdValid,
    oauthUrlPreview: oauthUrl,
  };
}

/** Log OAuth redirect parameters before user leaves for Meta (never log state). */
export async function logFacebookOAuthUrlGenerated(
  userId: string,
  parts: FacebookOAuthUrlParts
): Promise<void> {
  const configIdUsed =
    parts.configId && isValidMetaLoginConfigId(parts.configId)
      ? parts.configId
      : null;

  await writeSystemLog({
    userId,
    level: "info",
    source: "facebook",
    action: "oauth.url_generated",
    message: "Facebook OAuth URL generated",
    metadata: {
      client_id: parts.clientId,
      redirect_uri: parts.redirectUri,
      config_id: configIdUsed,
      has_config_id: !!configIdUsed,
      scopes: parts.scopes,
    },
  });
}

/** @deprecated use logFacebookOAuthUrlGenerated */
export async function logOAuthUrlPreview(userId: string, state: string): Promise<void> {
  const creds = await getMetaCredentials(userId);
  if (!creds) return;
  const configId = await getLoginConfigId(userId);
  await logFacebookOAuthUrlGenerated(userId, {
    clientId: creds.appId,
    redirectUri: getRedirectUri(),
    configId,
    scopes: FB_SCOPES,
  });
  void state;
}

export async function exchangeCodeForToken(
  userId: string,
  code: string
): Promise<{ accessToken: string; expiresIn?: number }> {
  const creds = await getMetaCredentials(userId);
  if (!creds) throw new Error("Meta App not configured");
  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    client_id: creds.appId,
    client_secret: creds.appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Facebook token exchange failed: ${err}`);
  }
  const data = await res.json();
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function getLongLivedToken(
  userId: string,
  shortLivedToken: string
): Promise<{ access_token: string; expires_in?: number }> {
  const creds = await getMetaCredentials(userId);
  if (!creds) throw new Error("Meta App not configured");

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: creds.appId,
    client_secret: creds.appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const res = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Facebook long-lived token exchange failed: ${err}`);
  }
  return res.json();
}

export async function debugAccessToken(
  userId: string,
  inputToken: string
): Promise<DebugTokenResult> {
  const creds = await getMetaCredentials(userId);
  if (!creds) {
    return { isValid: false, scopes: [], granularScopes: [], error: "Meta App not configured" };
  }

  const appAccessToken = `${creds.appId}|${creds.appSecret}`;
  const params = new URLSearchParams({
    input_token: inputToken,
    access_token: appAccessToken,
  });

  const res = await fetch(`${GRAPH_API_BASE}/debug_token?${params}`);
  const json = await res.json();

  if (!res.ok || json.error) {
    return {
      isValid: false,
      scopes: [],
      granularScopes: [],
      error: json.error?.message ?? "debug_token failed",
    };
  }

  const data = json.data as {
    is_valid?: boolean;
    app_id?: string;
    user_id?: string;
    scopes?: string[];
    granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
    expires_at?: number;
  };

  return {
    isValid: !!data.is_valid,
    appId: data.app_id,
    userId: data.user_id,
    scopes: data.scopes ?? [],
    granularScopes: data.granular_scopes ?? [],
    expiresAt: data.expires_at,
  };
}
