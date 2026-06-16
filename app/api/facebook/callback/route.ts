import { NextResponse } from "next/server";
import { getOAuthState, deleteOAuthState } from "@/lib/oauth-state";
import {
  exchangeCodeForToken,
  getLongLivedToken,
} from "@/services/facebook-auth.service";
import { saveFacebookConnection } from "@/services/facebook.service";
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
    const shortToken = await exchangeCodeForToken(userId, code);
    const longToken = await getLongLivedToken(userId, shortToken.accessToken);

    await saveFacebookConnection(
      userId,
      longToken.access_token,
      longToken.expires_in
    );

    await createAuditLog({
      userId,
      action: "facebook.connect",
      ipAddress: getClientIp(request),
    });

    return NextResponse.redirect(
      new URL(`/${locale}/facebook?success=connected`, baseUrl)
    );
  } catch {
    return NextResponse.redirect(
      new URL(`/${locale}/facebook?error=oauth_failed`, baseUrl)
    );
  }
}
