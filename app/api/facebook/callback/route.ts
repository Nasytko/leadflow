import { NextResponse } from "next/server";
import { getOAuthState, deleteOAuthState } from "@/lib/oauth-state";
import {
  exchangeCodeForToken,
  getLongLivedToken,
} from "@/services/facebook-auth.service";
import {
  getFacebookProfile,
  resetFacebookConnection,
  saveFacebookConnection,
  markFacebookConnectionInvalid,
} from "@/services/facebook.service";
import { getMetaCredentials } from "@/services/integration-settings.service";
import { getAppUrl } from "@/lib/env";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = getAppUrl();
  const locale = "ru";

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL(`/${locale}/facebook?error=oauth_denied`, baseUrl)
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
    const profile = await getFacebookProfile(longToken.access_token);

    await resetFacebookConnection(userId);

    await saveFacebookConnection(userId, longToken.access_token, {
      expiresIn: longToken.expires_in,
      facebookUserId: profile.id,
      facebookUserName: profile.name,
      facebookUserPictureUrl: profile.pictureUrl,
      metaAppIdAtAuth: creds.appId,
    });

    await createAuditLog({
      userId,
      action: "facebook.connect",
      ipAddress: getClientIp(request),
      metadata: {
        facebookUserId: profile.id,
        facebookUserName: profile.name,
        metaAppId: creds.appId,
      },
    });

    return NextResponse.redirect(
      new URL(`/${locale}/facebook?success=connected`, baseUrl)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth failed";
    try {
      await markFacebookConnectionInvalid(userId, err);
    } catch {
      // no existing connection to update
    }
    return NextResponse.redirect(
      new URL(
        `/${locale}/facebook?error=oauth_failed&reason=${encodeURIComponent(message)}`,
        baseUrl
      )
    );
  }
}
