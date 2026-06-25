import { decrypt, encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import {
  GraphApiError,
  InvalidFacebookTokenError,
  isInvalidOAuthTokenError,
  parseGraphApiError,
} from "@/lib/facebook-errors";
import type { FacebookLeadData } from "@/types";

import {
  getFacebookAuthUrl,
  exchangeCodeForToken,
  getLongLivedToken,
  debugAccessToken,
  FB_OAUTH_SCOPES,
} from "./facebook-auth.service";

export {
  getFacebookAuthUrl,
  exchangeCodeForToken,
  getLongLivedToken,
  debugAccessToken,
  FB_OAUTH_SCOPES,
};

export { InvalidFacebookTokenError, isInvalidOAuthTokenError };

import {
  computeFacebookDiagnosis,
  mapDiagnosisToUiStatus,
  getMissingScopes,
  type FacebookDiagnosis,
  type FacebookUiStatus,
  type GranularScope,
} from "@/lib/facebook-diagnosis";

export type { FacebookDiagnosis, FacebookUiStatus };
export { computeFacebookDiagnosis, mapDiagnosisToUiStatus, getMissingScopes };

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

const INVALID_TOKEN_MESSAGE =
  "Facebook token is invalid. Please reconnect Facebook.";

export const PAGES_ACCESS_MISSING_MESSAGE =
  "Facebook connected, but page access was not granted. Check Business Login Configuration and select company/pages when connecting.";

export type FacebookPagesAccessResult = {
  pages: Array<{
    id: string;
    name: string;
    access_token: string;
    pictureUrl?: string;
    category?: string;
    link?: string;
    tasks?: string[];
  }>;
  pagesCount: number;
  hasPageAccess: boolean;
};

export type GraphBusiness = {
  id: string;
  name: string;
  verification_status?: string;
  profile_picture_uri?: string;
  link?: string;
};

export type GraphPageAccount = {
  id: string;
  name: string;
  picture?: { data?: { url?: string } };
  category?: string;
  link?: string;
  tasks?: string[];
  access_token: string;
};

export type GraphPageDetail = {
  id: string;
  name: string;
  picture?: { data?: { url?: string } };
  category?: string;
  link?: string;
  about?: string;
  business?: { id: string; name?: string };
};

export type FacebookProfile = {
  id: string;
  name: string;
  pictureUrl?: string;
};

async function graphFetch<T>(
  path: string,
  accessToken: string,
  options?: RequestInit
): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${GRAPH_API_BASE}${path}${separator}access_token=${accessToken}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    const errText = await res.text();
    throw parseGraphApiError(errText);
  }
  return res.json();
}

export async function getFacebookProfile(
  accessToken: string
): Promise<FacebookProfile> {
  const data = await graphFetch<{
    id: string;
    name: string;
    picture?: { data?: { url?: string } };
  }>("/me?fields=id,name,picture", accessToken);

  return {
    id: data.id,
    name: data.name,
    pictureUrl: data.picture?.data?.url,
  };
}

export async function getUserBusinesses(accessToken: string) {
  return graphFetch<{ data: GraphBusiness[] }>(
    "/me/businesses?fields=id,name,verification_status,profile_picture_uri,link&limit=100",
    accessToken
  );
}

export async function getUserPageAccounts(accessToken: string) {
  return graphFetch<{ data: GraphPageAccount[] }>(
    "/me/accounts?fields=id,name,picture{url},category,link,tasks,access_token&limit=100",
    accessToken
  );
}

/** @deprecated use getUserPageAccounts */
export async function getUserPages(accessToken: string) {
  return getUserPageAccounts(accessToken);
}

export async function getPageDetails(pageId: string, accessToken: string) {
  return graphFetch<GraphPageDetail>(
    `/${pageId}?fields=id,name,picture{url},category,link,about,business`,
    accessToken
  );
}

export async function fetchPagesAccess(
  accessToken: string
): Promise<FacebookPagesAccessResult> {
  const { data: pages } = await getUserPageAccounts(accessToken);
  return {
    pages: (pages ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      access_token: p.access_token,
      pictureUrl: p.picture?.data?.url,
      category: p.category,
      link: p.link,
      tasks: p.tasks,
    })),
    pagesCount: pages?.length ?? 0,
    hasPageAccess: (pages?.length ?? 0) > 0,
  };
}

function resolveConnectionStatus(pagesCount: number): "connected" | "pending_pages" {
  return pagesCount > 0 ? "connected" : "pending_pages";
}

export async function getLeadgenForms(pageId: string, pageAccessToken: string) {
  return graphFetch<{
    data: Array<{
      id: string;
      name: string;
      status: string;
      created_time: string;
    }>;
    paging?: { cursors?: { after?: string } };
  }>(`/${pageId}/leadgen_forms?fields=id,name,status,created_time&limit=100`, pageAccessToken);
}

type LeadgenFormRow = {
  id: string;
  name: string;
  status: string;
  created_time: string;
};

/** Fetch all leadgen forms with Graph API pagination. */
export async function getAllLeadgenForms(
  pageId: string,
  pageAccessToken: string
): Promise<LeadgenFormRow[]> {
  const all: LeadgenFormRow[] = [];
  let after: string | undefined;

  do {
    let path = `/${pageId}/leadgen_forms?fields=id,name,status,created_time&limit=100`;
    if (after) path += `&after=${after}`;
    const response = await graphFetch<{
      data: LeadgenFormRow[];
      paging?: { cursors?: { after?: string } };
    }>(path, pageAccessToken);
    all.push(...(response.data ?? []));
    after = response.paging?.cursors?.after;
  } while (after);

  return all;
}

export async function getLeadDetails(
  leadgenId: string,
  pageAccessToken: string
): Promise<FacebookLeadData> {
  return graphFetch<FacebookLeadData>(
    `/${leadgenId}?fields=id,created_time,field_data,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name`,
    pageAccessToken
  );
}

export async function getFormLeads(
  formId: string,
  pageAccessToken: string,
  after?: string
) {
  let path = `/${formId}/leads?fields=id,created_time,field_data&limit=100`;
  if (after) path += `&after=${after}`;
  return graphFetch<{
    data: FacebookLeadData[];
    paging?: { cursors?: { after?: string }; next?: string };
  }>(path, pageAccessToken);
}

export async function subscribePageToWebhooks(
  pageId: string,
  pageAccessToken: string
) {
  return graphFetch<{ success: boolean }>(
    `/${pageId}/subscribed_apps?subscribed_fields=leadgen`,
    pageAccessToken,
    { method: "POST" }
  );
}

export async function unsubscribePageFromWebhooks(
  pageId: string,
  pageAccessToken: string
) {
  return graphFetch<{ success: boolean }>(
    `/${pageId}/subscribed_apps`,
    pageAccessToken,
    { method: "DELETE" }
  );
}

function graphErrorDetails(error: unknown): {
  message: string;
  code?: string;
} {
  if (error instanceof GraphApiError) {
    return {
      message: error.message,
      code: error.code != null ? String(error.code) : undefined,
    };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: "Unknown error" };
}

async function setFacebookConnectionError(
  userId: string,
  status: "invalid" | "expired" | "error",
  message: string,
  code?: string
) {
  await prisma.facebookConnection.updateMany({
    where: { userId },
    data: {
      status,
      lastError: message,
      lastErrorCode: code ?? null,
      lastErrorAt: new Date(),
    },
  });
}

async function clearFacebookConnectionErrors(userId: string) {
  await prisma.facebookConnection.updateMany({
    where: { userId },
    data: {
      status: "connected",
      lastError: null,
      lastErrorCode: null,
      lastErrorAt: null,
      lastCheckedAt: new Date(),
    },
  });
}

export async function handleFacebookGraphError(
  userId: string,
  error: unknown
): Promise<never> {
  if (isInvalidOAuthTokenError(error)) {
    const { message, code } = graphErrorDetails(error);
    await setFacebookConnectionError(
      userId,
      "invalid",
      message || INVALID_TOKEN_MESSAGE,
      code ?? "190"
    );
    throw new InvalidFacebookTokenError(INVALID_TOKEN_MESSAGE);
  }

  const { message, code } = graphErrorDetails(error);
  await setFacebookConnectionError(userId, "error", message, code);
  throw error instanceof Error ? error : new Error(message);
}

/**
 * Removes Facebook OAuth state for a user.
 * Deletes pages (cascades forms). Leads, delivery logs, and webhooks are kept.
 */
export async function resetFacebookConnection(userId: string) {
  await prisma.facebookPage.deleteMany({ where: { userId } });
  await prisma.facebookBusiness.deleteMany({ where: { userId } });
  await prisma.facebookConnection.deleteMany({ where: { userId } });
}

export async function markFacebookConnectionInvalid(
  userId: string,
  error?: unknown
) {
  const { message, code } = error
    ? graphErrorDetails(error)
    : { message: INVALID_TOKEN_MESSAGE, code: "190" };
  await setFacebookConnectionError(
    userId,
    "invalid",
    message || INVALID_TOKEN_MESSAGE,
    code ?? "190"
  );
}

export async function saveFacebookConnection(
  userId: string,
  accessToken: string,
  options: {
    expiresIn?: number;
    facebookUserId?: string;
    facebookUserName?: string;
    facebookUserPictureUrl?: string;
    metaAppIdAtAuth?: string;
    metaLoginConfigIdAtAuth?: string;
    grantedScopes?: string[];
    granularScopes?: Array<{ scope: string; target_ids?: string[] }>;
    pagesCountAtAuth?: number;
    status?: "connected" | "pending_pages";
  } = {}
) {
  const encrypted = encrypt(accessToken);
  const tokenExpiresAt = options.expiresIn
    ? new Date(Date.now() + options.expiresIn * 1000)
    : null;
  const now = new Date();
  const pagesCount = options.pagesCountAtAuth ?? 0;
  const status =
    options.status ?? resolveConnectionStatus(pagesCount);
  const lastError =
    status === "pending_pages" ? PAGES_ACCESS_MISSING_MESSAGE : null;
  const lastErrorCode = status === "pending_pages" ? "PAGES_ACCESS_MISSING" : null;

  return prisma.facebookConnection.upsert({
    where: { userId },
    create: {
      userId,
      accessTokenEncrypted: encrypted,
      tokenExpiresAt,
      facebookUserId: options.facebookUserId,
      facebookUserName: options.facebookUserName,
      facebookUserPictureUrl: options.facebookUserPictureUrl,
      metaAppIdAtAuth: options.metaAppIdAtAuth,
      metaLoginConfigIdAtAuth: options.metaLoginConfigIdAtAuth ?? null,
      grantedScopes: options.grantedScopes ?? [],
      granularScopes: options.granularScopes ?? [],
      pagesCountAtAuth: pagesCount,
      status,
      connectedAt: now,
      lastCheckedAt: now,
      lastError,
      lastErrorCode,
      lastErrorAt: status === "pending_pages" ? now : null,
    },
    update: {
      accessTokenEncrypted: encrypted,
      tokenExpiresAt,
      facebookUserId: options.facebookUserId,
      facebookUserName: options.facebookUserName,
      facebookUserPictureUrl: options.facebookUserPictureUrl,
      metaAppIdAtAuth: options.metaAppIdAtAuth,
      metaLoginConfigIdAtAuth: options.metaLoginConfigIdAtAuth ?? null,
      grantedScopes: options.grantedScopes ?? [],
      granularScopes: options.granularScopes ?? [],
      pagesCountAtAuth: pagesCount,
      status,
      connectedAt: now,
      lastCheckedAt: now,
      lastError,
      lastErrorCode,
      lastErrorAt: status === "pending_pages" ? now : null,
    },
  });
}

async function getCurrentMetaAppId(userId: string): Promise<string | null> {
  const settings = await prisma.integrationSettings.findUnique({
    where: { userId },
    select: { metaAppId: true },
  });
  return settings?.metaAppId ?? null;
}

async function assertTokenCredentialsMatch(
  userId: string,
  conn: {
    metaAppIdAtAuth: string | null;
    metaLoginConfigIdAtAuth: string | null;
  }
): Promise<void> {
  const currentAppId = await getCurrentMetaAppId(userId);
  if (
    conn.metaAppIdAtAuth &&
    currentAppId &&
    conn.metaAppIdAtAuth !== currentAppId
  ) {
    await markFacebookConnectionInvalid(
      userId,
      new Error("Meta App ID changed. Please reconnect Facebook.")
    );
    throw new InvalidFacebookTokenError(INVALID_TOKEN_MESSAGE);
  }

  const { getLoginConfigId } = await import("./integration-settings.service");
  const currentConfigId = await getLoginConfigId(userId);
  const authConfigId = conn.metaLoginConfigIdAtAuth?.trim() || null;
  const normalizedCurrent = currentConfigId?.trim() || null;

  if (authConfigId !== normalizedCurrent) {
    await markFacebookConnectionInvalid(
      userId,
      new Error(
        "Facebook Login Configuration changed. Please reconnect Facebook."
      )
    );
    throw new InvalidFacebookTokenError(INVALID_TOKEN_MESSAGE);
  }
}

export async function getDecryptedUserToken(userId: string): Promise<string | null> {
  const conn = await prisma.facebookConnection.findUnique({ where: { userId } });
  if (!conn) return null;

  if (conn.status === "invalid" || conn.status === "expired") {
    return null;
  }

  if (conn.tokenExpiresAt && conn.tokenExpiresAt < new Date()) {
    await setFacebookConnectionError(
      userId,
      "expired",
      "Facebook access token has expired. Please reconnect Facebook.",
      "EXPIRED"
    );
    return null;
  }

  try {
    await assertTokenCredentialsMatch(userId, conn);
  } catch {
    return null;
  }

  return decrypt(conn.accessTokenEncrypted);
}

export async function checkFacebookConnection(userId: string) {
  const conn = await prisma.facebookConnection.findUnique({ where: { userId } });
  if (!conn) {
    return { ok: false as const, status: "disconnected" as const };
  }

  const token = await getDecryptedUserToken(userId);
  if (!token) {
    const updated = await prisma.facebookConnection.findUnique({
      where: { userId },
    });
    return {
      ok: false as const,
      status: (updated?.status ?? "invalid") as string,
      lastError: updated?.lastError,
    };
  }

  try {
    const profile = await getFacebookProfile(token);
    const { debugAccessToken } = await import("./facebook-auth.service");
    const debug = await debugAccessToken(userId, token);
    const pagesAccess = await fetchPagesAccess(token);
    const status = resolveConnectionStatus(pagesAccess.pagesCount);
    const { getLoginConfigId } = await import("./integration-settings.service");
    const loginConfigId = await getLoginConfigId(userId);

    const updated = await prisma.facebookConnection.update({
      where: { userId },
      data: {
        status,
        facebookUserId: profile.id,
        facebookUserName: profile.name,
        facebookUserPictureUrl: profile.pictureUrl,
        grantedScopes: debug.scopes,
        granularScopes: debug.granularScopes,
        metaLoginConfigIdAtAuth: loginConfigId,
        pagesCountAtAuth: pagesAccess.pagesCount,
        lastCheckedAt: new Date(),
        lastError: status === "pending_pages" ? PAGES_ACCESS_MISSING_MESSAGE : null,
        lastErrorCode: status === "pending_pages" ? "PAGES_ACCESS_MISSING" : null,
        lastErrorAt: status === "pending_pages" ? new Date() : null,
      },
    });

    if (status === "pending_pages") {
      await syncFacebookIdentity(userId, { accessToken: token }).catch(() => {
        // identity sync is best-effort when pages list is empty
      });
      return {
        ok: false as const,
        status: "pending_pages" as const,
        lastError: PAGES_ACCESS_MISSING_MESSAGE,
        profile,
        connection: updated,
        pagesCount: 0,
      };
    }

    await syncFacebookIdentity(userId, { accessToken: token });

    const updatedConn = await prisma.facebookConnection.findUnique({
      where: { userId },
    });

    return {
      ok: true as const,
      status: "connected" as const,
      profile,
      connection: updatedConn ?? updated,
      pagesCount: pagesAccess.pagesCount,
    };
  } catch (error) {
    return handleFacebookGraphError(userId, error);
  }
}

export async function syncFacebookIdentity(
  userId: string,
  options: { accessToken?: string } = {}
) {
  const token =
    options.accessToken ?? (await getDecryptedUserToken(userId));
  if (!token) {
    throw new InvalidFacebookTokenError(INVALID_TOKEN_MESSAGE);
  }

  const now = new Date();
  const [profile, businessesRes, accountsRes] = await Promise.all([
    getFacebookProfile(token),
    getUserBusinesses(token).catch(() => ({ data: [] as GraphBusiness[] })),
    getUserPageAccounts(token).catch(() => ({ data: [] as GraphPageAccount[] })),
  ]);

  const businesses = businessesRes.data ?? [];
  const accounts = accountsRes.data ?? [];
  const businessIdMap = new Map<string, string>();

  for (const business of businesses) {
    const row = await prisma.facebookBusiness.upsert({
      where: {
        userId_businessId: { userId, businessId: business.id },
      },
      create: {
        userId,
        businessId: business.id,
        name: business.name,
        verificationStatus: business.verification_status ?? null,
        pictureUrl: business.profile_picture_uri ?? null,
        link: business.link ?? null,
      },
      update: {
        name: business.name,
        verificationStatus: business.verification_status ?? null,
        pictureUrl: business.profile_picture_uri ?? null,
        link: business.link ?? null,
      },
    });
    businessIdMap.set(business.id, row.id);
  }

  for (const account of accounts) {
    let detail: GraphPageDetail | null = null;
    try {
      detail = await getPageDetails(account.id, token);
    } catch {
      // use list-level fields when detail fetch fails
    }

    const metaBusinessId = detail?.business?.id;
    if (metaBusinessId && !businessIdMap.has(metaBusinessId)) {
      const row = await prisma.facebookBusiness.upsert({
        where: {
          userId_businessId: { userId, businessId: metaBusinessId },
        },
        create: {
          userId,
          businessId: metaBusinessId,
          name: detail?.business?.name ?? metaBusinessId,
          verificationStatus: null,
          pictureUrl: null,
          link: null,
        },
        update: {
          name: detail?.business?.name ?? metaBusinessId,
        },
      });
      businessIdMap.set(metaBusinessId, row.id);
    }

    const internalBusinessId = metaBusinessId
      ? businessIdMap.get(metaBusinessId) ?? null
      : null;
    const pictureUrl =
      detail?.picture?.data?.url ?? account.picture?.data?.url ?? null;

    const existing = await prisma.facebookPage.findUnique({
      where: { userId_pageId: { userId, pageId: account.id } },
      select: { connected: true },
    });

    await prisma.facebookPage.upsert({
      where: { userId_pageId: { userId, pageId: account.id } },
      create: {
        userId,
        pageId: account.id,
        pageName: detail?.name ?? account.name,
        pictureUrl,
        category: detail?.category ?? account.category ?? null,
        link: detail?.link ?? account.link ?? null,
        about: detail?.about ?? null,
        tasks: account.tasks ?? [],
        businessId: internalBusinessId,
        pageAccessTokenEncrypted: encrypt(account.access_token),
        connected: false,
        syncStatus: "success",
        lastSyncedAt: now,
        lastError: null,
        lastErrorAt: null,
      },
      update: {
        pageName: detail?.name ?? account.name,
        pictureUrl,
        category: detail?.category ?? account.category ?? null,
        link: detail?.link ?? account.link ?? null,
        about: detail?.about ?? null,
        tasks: account.tasks ?? [],
        businessId: internalBusinessId,
        pageAccessTokenEncrypted: encrypt(account.access_token),
        syncStatus: "success",
        lastSyncedAt: now,
        lastError: null,
        lastErrorAt: null,
        connected: existing?.connected ?? false,
      },
    });
  }

  const metaBusinessIds = [...businessIdMap.keys()];

  const connectionStatus = resolveConnectionStatus(accounts.length);

  await prisma.facebookConnection.updateMany({
    where: { userId },
    data: {
      facebookUserId: profile.id,
      facebookUserName: profile.name,
      facebookUserPictureUrl: profile.pictureUrl,
      businessIds: metaBusinessIds,
      primaryBusinessId: metaBusinessIds[0] ?? null,
      pagesCountAtAuth: accounts.length,
      status: connectionStatus,
      lastCheckedAt: now,
      lastError:
        connectionStatus === "pending_pages" ? PAGES_ACCESS_MISSING_MESSAGE : null,
      lastErrorCode:
        connectionStatus === "pending_pages" ? "PAGES_ACCESS_MISSING" : null,
      lastErrorAt: connectionStatus === "pending_pages" ? now : null,
    },
  });

  if (accounts.length > 0) {
    await clearFacebookConnectionErrors(userId);
  }

  const [syncedBusinesses, syncedPages] = await Promise.all([
    prisma.facebookBusiness.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    }),
    prisma.facebookPage.findMany({
      where: { userId },
      include: { business: true, forms: { select: { id: true, enabled: true } } },
      orderBy: { pageName: "asc" },
    }),
  ]);

  return {
    profile,
    businesses: syncedBusinesses,
    pages: syncedPages,
    businessesCount: syncedBusinesses.length,
    pagesCount: syncedPages.length,
  };
}

export function mapFacebookBusinessPublic(
  business: {
    id: string;
    businessId: string;
    name: string;
    verificationStatus: string | null;
    pictureUrl: string | null;
    link: string | null;
    updatedAt: Date;
  },
  counts?: { pagesCount?: number; formsCount?: number }
) {
  return {
    id: business.id,
    businessId: business.businessId,
    name: business.name,
    verificationStatus: business.verificationStatus,
    pictureUrl: business.pictureUrl,
    link: business.link,
    updatedAt: business.updatedAt,
    pagesCount: counts?.pagesCount ?? 0,
    formsCount: counts?.formsCount ?? 0,
  };
}

export function mapFacebookPagePublic(page: {
  id: string;
  pageId: string;
  pageName: string;
  pictureUrl: string | null;
  category: string | null;
  link: string | null;
  about: string | null;
  tasks: unknown;
  connected: boolean;
  syncStatus: string;
  webhookStatus: string;
  lastSyncedAt: Date | null;
  lastError: string | null;
  business?: {
    id: string;
    businessId: string;
    name: string;
    verificationStatus: string | null;
    pictureUrl: string | null;
  } | null;
  forms?: Array<{ id: string; enabled: boolean }>;
}) {
  const tasks = Array.isArray(page.tasks) ? (page.tasks as string[]) : [];
  const activeFormsCount =
    page.forms?.filter((f) => f.enabled).length ?? 0;
  const totalFormsCount = page.forms?.length ?? 0;

  return {
    id: page.id,
    pageId: page.pageId,
    pageName: page.pageName,
    pictureUrl: page.pictureUrl,
    category: page.category,
    link: page.link,
    about: page.about,
    tasks,
    connected: page.connected,
    syncStatus: page.syncStatus,
    webhookStatus: page.webhookStatus,
    lastSyncedAt: page.lastSyncedAt,
    lastError: page.lastError,
    activeFormsCount,
    totalFormsCount,
    business: page.business
      ? {
          id: page.business.id,
          businessId: page.business.businessId,
          name: page.business.name,
          verificationStatus: page.business.verificationStatus,
          pictureUrl: page.business.pictureUrl,
        }
      : null,
  };
}

export async function syncUserPages(userId: string) {
  const conn = await prisma.facebookConnection.findUnique({ where: { userId } });
  if (!conn) throw new Error("Facebook not connected");

  if (conn.status === "invalid" || conn.status === "expired") {
    throw new InvalidFacebookTokenError(INVALID_TOKEN_MESSAGE);
  }

  try {
    const result = await syncFacebookIdentity(userId);
    if (result.pagesCount === 0) {
      throw new Error(PAGES_ACCESS_MISSING_MESSAGE);
    }
    return result.pages;
  } catch (error) {
    await prisma.facebookPage.updateMany({
      where: { userId },
      data: {
        syncStatus: "failed",
        lastError:
          error instanceof Error ? error.message : "Page sync failed",
        lastErrorAt: new Date(),
      },
    });
    if (error instanceof InvalidFacebookTokenError) {
      return handleFacebookGraphError(userId, error);
    }
    if (isInvalidOAuthTokenError(error)) {
      return handleFacebookGraphError(userId, error);
    }
    throw error instanceof Error ? error : new Error("Page sync failed");
  }
}

export async function syncUserForms(userId: string) {
  const conn = await prisma.facebookConnection.findUnique({ where: { userId } });
  if (!conn) throw new Error("Facebook not connected");

  if (!isFacebookConnectionUsable(conn.status)) {
    throw new InvalidFacebookTokenError(INVALID_TOKEN_MESSAGE);
  }

  const pages = await prisma.facebookPage.findMany({
    where: { userId, connected: true },
  });

  let synced = 0;
  let hadError = false;
  let lastError: string | undefined;

  for (const page of pages) {
    const pageToken = decrypt(page.pageAccessTokenEncrypted);
    try {
      const forms = await getAllLeadgenForms(page.pageId, pageToken);

      for (const form of forms) {
        await prisma.facebookForm.upsert({
          where: {
            pageId_formId: { pageId: page.id, formId: form.id },
          },
          create: {
            pageId: page.id,
            formId: form.id,
            formName: form.name,
            status: form.status,
            metaCreatedAt: form.created_time ? new Date(form.created_time) : null,
            enabled: false,
            syncStatus: "success",
            lastSyncError: null,
            lastSyncAt: new Date(),
          },
          update: {
            formName: form.name,
            status: form.status,
            metaCreatedAt: form.created_time ? new Date(form.created_time) : undefined,
            syncStatus: "success",
            lastSyncError: null,
            lastSyncAt: new Date(),
          },
        });
        synced++;
      }
    } catch (error) {
      hadError = true;
      const { message } = graphErrorDetails(error);
      lastError = message;
      await prisma.facebookForm.updateMany({
        where: { pageId: page.id },
        data: {
          syncStatus: "failed",
          lastSyncError: message,
          lastSyncAt: new Date(),
        },
      });
      if (isInvalidOAuthTokenError(error)) {
        await handleFacebookGraphError(userId, error);
      }
    }
  }

  if (hadError && lastError) {
    await setFacebookConnectionError(userId, "error", lastError);
    throw new Error(lastError);
  }

  await clearFacebookConnectionErrors(userId);
  return { synced };
}

function isFacebookConnectionUsable(status: string): boolean {
  return status === "connected";
}

export async function debugFacebookPermissions(userId: string) {
  const conn = await prisma.facebookConnection.findUnique({ where: { userId } });
  const token = await getDecryptedUserToken(userId);
  if (!token) {
    return {
      hasToken: false,
      connectionStatus: conn?.status ?? "disconnected",
      diagnosis: "disconnected" as const,
      uiStatus: "disconnected" as const,
      error: conn?.lastError ?? "Facebook not connected or token invalid",
    };
  }

  const { debugAccessToken } = await import("./facebook-auth.service");
  const { getLoginConfigId } = await import("./integration-settings.service");

  const [debug, pagesAccess, loginConfigId] = await Promise.all([
    debugAccessToken(userId, token),
    fetchPagesAccess(token).catch(() => ({
      pages: [],
      pagesCount: 0,
      hasPageAccess: false,
    })),
    getLoginConfigId(userId),
  ]);

  const granularPageIds = debug.granularScopes.flatMap(
    (g) => g.target_ids ?? []
  );

  const diagnosis = computeFacebookDiagnosis({
    hasToken: true,
    connectionStatus: conn?.status ?? "connected",
    grantedScopes: debug.scopes,
    granularScopes: debug.granularScopes,
    pagesCount: pagesAccess.pagesCount,
    hasLoginConfigId: !!loginConfigId,
    profilePresent: debug.isValid,
  });

  const uiStatus = mapDiagnosisToUiStatus(
    diagnosis,
    conn?.status ?? "connected"
  );

  return {
    hasToken: true,
    diagnosis,
    uiStatus,
    missingScopes: getMissingScopes(debug.scopes),
    debug,
    pagesFromAccounts: pagesAccess.pages.map((p) => ({
      id: p.id,
      name: p.name,
    })),
    pagesCount: pagesAccess.pagesCount,
    hasPageAccess: pagesAccess.hasPageAccess,
    granularPageIds,
    granularScopes: debug.granularScopes,
    loginConfigId,
    hasLoginConfigId: !!loginConfigId,
    requestedScopes: [...FB_OAUTH_SCOPES],
  };
}

export async function connectPage(userId: string, pageDbId: string) {
  const page = await prisma.facebookPage.findFirst({
    where: { id: pageDbId, userId },
  });
  if (!page) throw new Error("Page not found");

  const pageToken = decrypt(page.pageAccessTokenEncrypted);
  try {
    await subscribePageToWebhooks(page.pageId, pageToken);

    return prisma.facebookPage.update({
      where: { id: pageDbId },
      data: {
        connected: true,
        webhookStatus: "success",
        webhookSubscribedAt: new Date(),
        lastError: null,
        lastErrorAt: null,
      },
    });
  } catch (error) {
    const { message } = graphErrorDetails(error);
    await prisma.facebookPage.update({
      where: { id: pageDbId },
      data: {
        webhookStatus: "failed",
        lastError: message,
        lastErrorAt: new Date(),
      },
    });
    if (isInvalidOAuthTokenError(error)) {
      await handleFacebookGraphError(userId, error);
    }
    throw error instanceof Error ? error : new Error(message);
  }
}

export async function disconnectPage(userId: string, pageDbId: string) {
  const page = await prisma.facebookPage.findFirst({
    where: { id: pageDbId, userId },
  });
  if (!page) throw new Error("Page not found");

  if (page.connected) {
    try {
      const pageToken = decrypt(page.pageAccessTokenEncrypted);
      await unsubscribePageFromWebhooks(page.pageId, pageToken);
    } catch (error) {
      const { message } = graphErrorDetails(error);
      const { writeSystemLog } = await import("@/lib/system-log");
      await writeSystemLog({
        userId,
        level: "warn",
        source: "facebook",
        action: "webhook.unsubscribe_failed",
        message,
        metadata: { pageId: page.pageId },
      });
    }
  }

  return prisma.facebookPage.update({
    where: { id: pageDbId },
    data: {
      connected: false,
      webhookStatus: "pending",
      webhookSubscribedAt: null,
      lastError: null,
      lastErrorAt: null,
    },
  });
}

export function parseLeadFields(fieldData: Array<{ name: string; values: string[] }>) {
  const fields: Record<string, string> = {};
  let name = "";
  let phone = "";
  let email = "";

  for (const field of fieldData) {
    const value = field.values[0] ?? "";
    fields[field.name] = value;

    const lowerName = field.name.toLowerCase();
    if (lowerName.includes("full_name") || lowerName === "name" || lowerName.includes("имя")) {
      name = value;
    } else if (lowerName.includes("phone") || lowerName.includes("телефон")) {
      phone = value;
    } else if (lowerName.includes("email") || lowerName.includes("почта")) {
      email = value;
    }
  }

  return { name, phone, email, fields };
}

export async function findPageByFacebookId(facebookPageId: string) {
  const pages = await prisma.facebookPage.findMany({
    where: { pageId: facebookPageId, connected: true },
    include: { user: true },
    take: 2,
  });

  if (pages.length === 0) return null;
  if (pages.length > 1) {
    const { writeSystemLog } = await import("@/lib/system-log");
    await writeSystemLog({
      level: "error",
      source: "webhook",
      action: "page.ambiguous",
      message: `Multiple tenants connected to Facebook page ${facebookPageId}`,
      metadata: { pageId: facebookPageId, userIds: pages.map((p) => p.userId) },
    });
    throw new Error(`Ambiguous page ownership for page ${facebookPageId}`);
  }

  return pages[0];
}

export function mapFacebookConnectionPublic(conn: {
  status: string;
  facebookUserId: string | null;
  facebookUserName: string | null;
  facebookUserPictureUrl: string | null;
  metaAppIdAtAuth?: string | null;
  metaLoginConfigIdAtAuth?: string | null;
  grantedScopes?: unknown;
  granularScopes?: unknown;
  pagesCountAtAuth?: number | null;
  connectedAt: Date | null;
  lastCheckedAt: Date | null;
  lastError: string | null;
  lastErrorCode: string | null;
  lastErrorAt: Date | null;
  tokenExpiresAt: Date | null;
}, options?: { hasLoginConfigId?: boolean }) {
  const grantedScopes = Array.isArray(conn.grantedScopes)
    ? (conn.grantedScopes as string[])
    : [];
  const granularScopes = Array.isArray(conn.granularScopes)
    ? (conn.granularScopes as GranularScope[])
    : [];

  const pagesCount = conn.pagesCountAtAuth ?? 0;
  const hasToken =
    conn.status !== "disconnected" &&
    conn.status !== "invalid" &&
    conn.status !== "expired";

  const diagnosis = computeFacebookDiagnosis({
    hasToken,
    connectionStatus: conn.status,
    grantedScopes,
    granularScopes,
    pagesCount,
    hasLoginConfigId: options?.hasLoginConfigId ?? !!conn.metaLoginConfigIdAtAuth,
    profilePresent: !!conn.facebookUserId,
  });

  const uiStatus = mapDiagnosisToUiStatus(diagnosis, conn.status);

  return {
    status: conn.status,
    uiStatus,
    diagnosis,
    facebookUserId: conn.facebookUserId,
    facebookUserName: conn.facebookUserName,
    facebookUserPictureUrl: conn.facebookUserPictureUrl,
    appIdUsed: conn.metaAppIdAtAuth ?? null,
    loginConfigIdAtAuth: conn.metaLoginConfigIdAtAuth ?? null,
    grantedScopes,
    granularScopes,
    missingScopes: getMissingScopes(grantedScopes),
    pagesCountAtAuth: pagesCount,
    pagesAccessMissing:
      uiStatus === "pages_missing" || uiStatus === "permissions_missing",
    connectedAt: conn.connectedAt,
    lastCheckedAt: conn.lastCheckedAt,
    lastError: conn.lastError,
    lastErrorCode: conn.lastErrorCode,
    lastErrorAt: conn.lastErrorAt,
    tokenExpiresAt: conn.tokenExpiresAt,
    connected: uiStatus === "fully_connected",
    tokenInvalid: conn.status === "invalid" || conn.status === "expired",
  };
}
