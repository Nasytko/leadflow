import { NextResponse } from "next/server";
import {
  getOAuthState,
  deleteOAuthState,
  parseOAuthStateValue,
} from "@/lib/oauth-state";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  debugAccessToken,
} from "@/services/facebook-auth.service";
import {
  saveFacebookConnection,
  setFacebookConnectionError,
  fetchPagesAccess,
  syncFacebookIdentity,
  syncFormsForAllDiscoveredPages,
  getFacebookProfile,
} from "@/services/facebook.service";
import { syncUserAdAccounts } from "@/services/meta-ads.service";
import {
  getMetaCredentials,
  getLoginConfigId,
} from "@/services/integration-settings.service";
import { getAppUrl } from "@/lib/env";
import { createAuditLog } from "@/lib/audit";
import { classifyFacebookOAuthError } from "@/lib/facebook-oauth-errors";
import { getClientIp } from "@/lib/utils";
import { writeSystemLog } from "@/lib/system-log";

function parseMetaGraphError(message: string): {
  metaErrorType?: string;
  metaErrorCode?: number;
  metaErrorSubcode?: number;
} {
  try {
    const jsonStart = message.indexOf("{");
    if (jsonStart === -1) return {};
    const parsed = JSON.parse(message.slice(jsonStart)) as {
      error?: {
        type?: string;
        code?: number;
        error_subcode?: number;
      };
    };
    return {
      metaErrorType: parsed.error?.type,
      metaErrorCode: parsed.error?.code,
      metaErrorSubcode: parsed.error?.error_subcode,
    };
  } catch {
    return {};
  }
}

function facebookRedirect(
  baseUrl: string,
  locale: string,
  params: Record<string, string>
) {
  const url = new URL(`/${locale}/facebook`, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = getAppUrl();
  let locale = "ru";
  let userId: string | null = null;

  const logOAuth = async (
    action: string,
    message: string,
    metadata: Record<string, unknown> = {},
    level: "info" | "warn" | "error" = "info"
  ) => {
    await writeSystemLog({
      userId,
      level,
      source: "facebook",
      action,
      message,
      metadata,
    });
  };

  await logOAuth("facebook.oauth.callback.started", "Facebook OAuth callback received", {
    hasCode: !!code,
    hasState: !!state,
    oauthError: error ?? null,
  });

  if (error || !code || !state) {
    const errCode = error === "access_denied" ? "oauth_denied" : "missing_code";
    const safeReason =
      error === "access_denied"
        ? "User declined Facebook permissions"
        : errorDescription ?? "Authorization code or state missing";
    await logOAuth(
      "facebook.oauth.callback.failed",
      "Facebook OAuth callback missing code or denied",
      { errorCode: errCode, safeMessage: safeReason, oauthError: error },
      "warn"
    );
    return facebookRedirect(baseUrl, locale, {
      error: errCode === "oauth_denied" ? "oauth_denied" : "oauth_failed",
      reason: safeReason,
    });
  }

  const rawState = await getOAuthState(`fb_oauth_state:${state}`);
  const parsedState = parseOAuthStateValue(rawState);
  userId = parsedState?.userId ?? null;
  locale = parsedState?.locale ?? "ru";

  if (!userId) {
    await logOAuth(
      "facebook.oauth.callback.failed",
      "OAuth state invalid or expired",
      { errorCode: "invalid_state", safeMessage: "invalid_state" },
      "warn"
    );
    return facebookRedirect(baseUrl, locale, {
      error: "invalid_state",
      reason: "invalid_state",
    });
  }

  await deleteOAuthState(`fb_oauth_state:${state}`);
  await logOAuth("facebook.oauth.state.validated", "OAuth state validated", {
    locale,
  });

  try {
    const creds = await getMetaCredentials(userId);
    if (!creds) {
      throw new Error("Meta App not configured");
    }

    const shortToken = await exchangeCodeForToken(userId, code);
    await logOAuth("facebook.oauth.token_exchanged", "Short-lived token exchanged");

    const longToken = await getLongLivedToken(userId, shortToken.accessToken);
    await logOAuth(
      "facebook.oauth.long_lived_token_created",
      "Long-lived user token created",
      { expiresIn: longToken.expires_in ?? null }
    );

    const [profile, debug, pagesAccess] = await Promise.all([
      getFacebookProfile(longToken.access_token),
      debugAccessToken(userId, longToken.access_token),
      fetchPagesAccess(longToken.access_token),
    ]);

    await logOAuth("facebook.oauth.debug_token_checked", "debug_token validated", {
      isValid: debug.isValid,
      appId: debug.appId ?? null,
      userId: debug.userId ?? null,
      scopesCount: debug.scopes.length,
      granularScopesCount: debug.granularScopes.length,
      pagesCountAtAuth: pagesAccess.pagesCount,
    });

    if (!debug.isValid) {
      throw new Error(debug.error ?? "debug_token reported invalid token");
    }

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

    await logOAuth("facebook.oauth.connection_saved", "Facebook connection saved", {
      facebookUserId: profile.id,
      connectionStatus,
      pagesCountAtAuth: pagesAccess.pagesCount,
    });

    await logOAuth("facebook.oauth.sync_started", "Syncing businesses and pages");
    const identity = await syncFacebookIdentity(userId, {
      accessToken: longToken.access_token,
    });

    let adAccountsSynced = 0;
    try {
      const adSync = await syncUserAdAccounts(userId);
      adAccountsSynced = adSync.synced;
    } catch {
      // ad account sync is best-effort when ads_read not granted
    }

    let formsSynced = 0;
    let formsSyncError: string | undefined;
    try {
      const formsResult = await syncFormsForAllDiscoveredPages(userId);
      formsSynced = formsResult.synced;
    } catch (syncErr) {
      formsSyncError =
        syncErr instanceof Error ? syncErr.message : "Forms sync failed";
    }

    await logOAuth("facebook.oauth.sync_finished", "Facebook identity sync finished", {
      businessesCount: identity.businessesCount,
      pagesCount: identity.pagesCount,
      formsSynced,
      adAccountsSynced,
      formsSyncError: formsSyncError ?? null,
      level: formsSyncError ? "warn" : "info",
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
        formsSynced,
        status: connectionStatus,
      },
    });

    const query: Record<string, string> = {
      facebook_connected: "1",
    };
    if (connectionStatus === "pending_pages" || identity.pagesCount === 0) {
      query.success = "connected_no_pages";
    } else {
      query.success = "connected";
    }
    if (formsSyncError) {
      query.forms_sync = "failed";
      query.reason = formsSyncError.slice(0, 200);
    }

    return facebookRedirect(baseUrl, locale, query);
  } catch (err) {
    const raw = err instanceof Error ? err.message : "OAuth failed";
    const classified = classifyFacebookOAuthError(raw);
    const meta = parseMetaGraphError(raw);

    await logOAuth(
      "facebook.oauth.callback.failed",
      classified.message,
      {
        errorCode: classified.code,
        reason: classified.code,
        safeMessage: classified.message,
        metaErrorType: meta.metaErrorType,
        metaErrorCode: meta.metaErrorCode,
        metaErrorSubcode: meta.metaErrorSubcode,
      },
      "error"
    );

    try {
      await setFacebookConnectionError(
        userId,
        "error",
        classified.message,
        classified.code
      );
    } catch {
      // best-effort
    }

    return facebookRedirect(baseUrl, locale, {
      error: classified.code === "token_exchange_failed" ? classified.code : "oauth_failed",
      reason: classified.message,
    });
  }
}
