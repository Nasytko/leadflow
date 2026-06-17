import {
  getMetaCredentials,
  getRedirectUri,
  getLoginConfigId,
} from "./integration-settings.service";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

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

export async function getFacebookAuthUrl(
  userId: string,
  state: string
): Promise<string> {
  const creds = await getMetaCredentials(userId);
  if (!creds) {
    throw new Error("Meta App not configured");
  }
  const redirectUri = getRedirectUri();
  const configId = await getLoginConfigId(userId);

  const params = new URLSearchParams({
    client_id: creds.appId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
  });

  if (configId) {
    // Facebook Login for Business — permissions come from the configuration
    params.set("config_id", configId);
    // Explicit scopes as supplement (Meta may merge with config permissions)
    params.set("scope", FB_SCOPES);
  } else {
    params.set("scope", FB_SCOPES);
  }

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params}`;
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
