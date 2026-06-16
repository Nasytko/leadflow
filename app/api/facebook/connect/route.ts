import { NextResponse } from "next/server";
import { generateSecureToken } from "@/lib/encryption";
import { getFacebookAuthUrl } from "@/services/facebook-auth.service";
import { isMetaConfiguredForUser } from "@/services/integration-settings.service";
import { requireAuth, checkRateLimit, apiError } from "@/lib/api-helpers";
import { saveOAuthState } from "@/lib/oauth-state";

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
    const state = generateSecureToken(16);
    await saveOAuthState(`fb_oauth_state:${state}`, authResult.session.user.id);
    const url = await getFacebookAuthUrl(authResult.session.user.id, state);
    return NextResponse.json({ data: { url } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connect failed";
    return apiError("CONNECT_FAILED", message, 500);
  }
}
