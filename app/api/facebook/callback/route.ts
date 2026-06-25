import { NextResponse } from "next/server";
import { getOAuthState, deleteOAuthState } from "@/lib/oauth-state";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  debugAccessToken,
} from "@/services/facebook-auth.service";
import {
  resetFacebookConnection,
  saveFacebookConnection,
  markFacebookConnectionInvalid,
  fetchPagesAccess,
  syncFacebookIdentity,
  getFacebookProfile,
} from "@/services/facebook.service";
import { getMetaCredentials, getLoginConfigId } from "@/services/integration-settings.service";
import { getAppUrl } from "@/lib/env";
import { createAuditLog } from "@/lib/audit";
import { classifyFacebookOAuthError } from "@/lib/facebook-oauth-errors";
import { getClientIp } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = getAppUrl();
  const locale = "ru";

  if (error || !code || !state) {
    const errCode = error === "access_denied" ? "oauth_denied" : "missing_code";
    return NextResponse.redirect(
      new URL(`/${locale}/facebook?error=${errCode}`, baseUrl)
    );
  }

  const userId = await getOAuthState(`fb_oauth_state:${state}`);
  if (!userId) {
    return NextResponse.redirect(
      new URL(`/${locale}/facebook?error=invalid_state`, baseUrl)
    );
  }
  await deleteOAuthState(`fb_oauth_state:${state}`);

  try {
    const creds = await getMetaCredentials(userId);
    if (!creds) {
      throw new Error("Meta App not configured");
    }

    const shortToken = await exchangeCodeForToken(userId, code);
    const longToken = await getLongLivedToken(userId, shortToken.accessToken);
    const [profile, debug, pagesAccess] = await Promise.all([
      getFacebookProfile(longToken.access_token),
      debugAccessToken(userId, longToken.access_token),
      fetchPagesAccess(longToken.access_token),
    ]);

    await resetFacebookConnection(userId);

    const loginConfigId = await getLoginConfigId(userId);

    const connectionStatus =
      pagesAccess.pagesCount > 0 ? "connected" : "pending_pages";

    await saveFacebookConnection(userId, longToken.access_token, {
      expiresIn: longToken.expires_in,
      facebookUserId: profile.id,
      facebookUserName: profile.name,
      facebookUserPictureUrl: profile.pictureUrl,
      metaAppIdAtAuth: creds.appId,
      metaLoginConfigIdAtAuth: loginConfigId ?? undefined,
      grantedScopes: debug.scopes,
      granularScopes: debug.granularScopes,
      pagesCountAtAuth: pagesAccess.pagesCount,
      status: connectionStatus,
    });

    const identity = await syncFacebookIdentity(userId, {
      accessToken: longToken.access_token,
    });

    await createAuditLog({
      userId,
      action: "facebook.connect",
      ipAddress: getClientIp(request),
      metadata: {
        facebookUserId: identity.profile.id,
        facebookUserName: identity.profile.name,
        metaAppId: creds.appId,
        grantedScopes: debug.scopes,
        granularScopes: debug.granularScopes,
        metaLoginConfigId: loginConfigId,
        businessesCount: identity.businessesCount,
        pagesCount: identity.pagesCount,
        status: connectionStatus,
      },
    });

    const query =
      connectionStatus === "connected"
        ? "success=connected"
        : "success=connected_no_pages";

    return NextResponse.redirect(
      new URL(`/${locale}/facebook?${query}`, baseUrl)
    );
  } catch (err) {
    const raw = err instanceof Error ? err.message : "OAuth failed";
    const classified = classifyFacebookOAuthError(raw);
    try {
      await markFacebookConnectionInvalid(userId, err);
    } catch {
      // no existing connection to update
    }
    return NextResponse.redirect(
      new URL(
        `/${locale}/facebook?error=${classified.code}&reason=${encodeURIComponent(classified.message)}`,
        baseUrl
      )
    );
  }
}
