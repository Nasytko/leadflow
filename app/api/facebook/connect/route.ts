import { NextResponse } from "next/server";
import { generateSecureToken } from "@/lib/encryption";
import {
  getFacebookAuthUrl,
  logFacebookOAuthUrlGenerated,
  FB_SCOPES,
} from "@/services/facebook-auth.service";
import {
  getMetaCredentials,
  getLoginConfigId,
  getRedirectUri,
  isMetaConfiguredForUser,
} from "@/services/integration-settings.service";
import { requireAuth, checkRateLimit, apiError } from "@/lib/api-helpers";
import { saveOAuthState } from "@/lib/oauth-state";

function localeFromRequest(request: Request): string {
  const referer = request.headers.get("referer");
  const match = referer?.match(/\/(ru|en)\//);
  return match?.[1] ?? "ru";
}

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(
    request,
    authResult.session.user.id
  );
  if (rateLimitError) return rateLimitError;

  const configured = await isMetaConfiguredForUser(authResult.session.user.id);
  if (!configured) {
    return apiError(
      "NOT_CONFIGURED",
      "Configure Meta App in Settings first",
      400
    );
  }

  try {
    const userId = authResult.session.user.id;
    const state = generateSecureToken(16);
    const locale = localeFromRequest(request);
    await saveOAuthState(`fb_oauth_state:${state}`, {
      userId,
      locale,
    });

    const creds = await getMetaCredentials(userId);
    if (!creds) {
      throw new Error("Meta App not configured");
    }

    const configId = await getLoginConfigId(userId);
    await logFacebookOAuthUrlGenerated(userId, {
      clientId: creds.appId,
      redirectUri: getRedirectUri(),
      configId,
      scopes: FB_SCOPES,
    });

    const url = await getFacebookAuthUrl(userId, state);
    return NextResponse.json({ data: { url } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connect failed";
    return apiError("CONNECT_FAILED", message, 500);
  }
}
