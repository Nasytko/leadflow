import { getMetaCredentials, getRedirectUri } from "./integration-settings.service";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const FB_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "leads_retrieval",
  "ads_read",
  "pages_manage_ads",
].join(",");

export async function getFacebookAuthUrl(
  userId: string,
  state: string
): Promise<string> {
  const creds = await getMetaCredentials(userId);
  if (!creds) {
    throw new Error("Meta App not configured");
  }
  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    client_id: creds.appId,
    redirect_uri: redirectUri,
    state,
    scope: FB_SCOPES,
    response_type: "code",
  });
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
