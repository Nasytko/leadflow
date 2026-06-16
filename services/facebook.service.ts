import { decrypt, encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import {
  GraphApiError,
  InvalidFacebookTokenError,
  isInvalidOAuthTokenError,
  parseGraphApiError,
} from "@/lib/facebook-errors";
import type { FacebookLeadData } from "@/types";

export {
  getFacebookAuthUrl,
  exchangeCodeForToken,
  getLongLivedToken,
} from "./facebook-auth.service";

export { InvalidFacebookTokenError, isInvalidOAuthTokenError };

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

const INVALID_TOKEN_MESSAGE =
  "Facebook token is invalid. Please reconnect Facebook.";

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

export async function getUserPages(accessToken: string) {
  return graphFetch<{
    data: Array<{
      id: string;
      name: string;
      access_token: string;
    }>;
  }>("/me/accounts?fields=id,name,access_token", accessToken);
}

export async function getLeadgenForms(pageId: string, pageAccessToken: string) {
  return graphFetch<{
    data: Array<{
      id: string;
      name: string;
      status: string;
      created_time: string;
    }>;
  }>(`/${pageId}/leadgen_forms?fields=id,name,status,created_time`, pageAccessToken);
}

export async function getLeadDetails(
  leadgenId: string,
  pageAccessToken: string
): Promise<FacebookLeadData> {
  return graphFetch<FacebookLeadData>(
    `/${leadgenId}?fields=id,created_time,field_data`,
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
  } = {}
) {
  const encrypted = encrypt(accessToken);
  const tokenExpiresAt = options.expiresIn
    ? new Date(Date.now() + options.expiresIn * 1000)
    : null;
  const now = new Date();

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
      status: "connected",
      connectedAt: now,
      lastCheckedAt: now,
      lastError: null,
      lastErrorCode: null,
      lastErrorAt: null,
    },
    update: {
      accessTokenEncrypted: encrypted,
      tokenExpiresAt,
      facebookUserId: options.facebookUserId,
      facebookUserName: options.facebookUserName,
      facebookUserPictureUrl: options.facebookUserPictureUrl,
      metaAppIdAtAuth: options.metaAppIdAtAuth,
      status: "connected",
      connectedAt: now,
      lastCheckedAt: now,
      lastError: null,
      lastErrorCode: null,
      lastErrorAt: null,
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
    await getUserPages(token);

    const updated = await prisma.facebookConnection.update({
      where: { userId },
      data: {
        status: "connected",
        facebookUserId: profile.id,
        facebookUserName: profile.name,
        facebookUserPictureUrl: profile.pictureUrl,
        lastCheckedAt: new Date(),
        lastError: null,
        lastErrorCode: null,
        lastErrorAt: null,
      },
    });

    return {
      ok: true as const,
      status: "connected" as const,
      profile,
      connection: updated,
    };
  } catch (error) {
    return handleFacebookGraphError(userId, error);
  }
}

export async function syncUserPages(userId: string) {
  const conn = await prisma.facebookConnection.findUnique({ where: { userId } });
  if (!conn) throw new Error("Facebook not connected");

  if (conn.status === "invalid" || conn.status === "expired") {
    throw new InvalidFacebookTokenError(INVALID_TOKEN_MESSAGE);
  }

  const token = await getDecryptedUserToken(userId);
  if (!token) {
    throw new InvalidFacebookTokenError(INVALID_TOKEN_MESSAGE);
  }

  try {
    const { data: pages } = await getUserPages(token);

    for (const page of pages) {
      await prisma.facebookPage.upsert({
        where: { userId_pageId: { userId, pageId: page.id } },
        create: {
          userId,
          pageId: page.id,
          pageName: page.name,
          pageAccessTokenEncrypted: encrypt(page.access_token),
          connected: false,
          syncStatus: "success",
          lastError: null,
          lastErrorAt: null,
        },
        update: {
          pageName: page.name,
          pageAccessTokenEncrypted: encrypt(page.access_token),
          syncStatus: "success",
          lastError: null,
          lastErrorAt: null,
        },
      });
    }

    await clearFacebookConnectionErrors(userId);

    return prisma.facebookPage.findMany({
      where: { userId },
      orderBy: { pageName: "asc" },
    });
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
    return handleFacebookGraphError(userId, error);
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
      const { data: forms } = await getLeadgenForms(page.pageId, pageToken);

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
            enabled: false,
            syncStatus: "success",
            lastSyncError: null,
            lastSyncAt: new Date(),
          },
          update: {
            formName: form.name,
            status: form.status,
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
  return prisma.facebookPage.updateMany({
    where: { id: pageDbId, userId },
    data: { connected: false, webhookStatus: "pending" },
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
  connectedAt: Date | null;
  lastCheckedAt: Date | null;
  lastError: string | null;
  lastErrorCode: string | null;
  lastErrorAt: Date | null;
  tokenExpiresAt: Date | null;
}) {
  return {
    status: conn.status,
    facebookUserId: conn.facebookUserId,
    facebookUserName: conn.facebookUserName,
    facebookUserPictureUrl: conn.facebookUserPictureUrl,
    appIdUsed: conn.metaAppIdAtAuth ?? null,
    connectedAt: conn.connectedAt,
    lastCheckedAt: conn.lastCheckedAt,
    lastError: conn.lastError,
    lastErrorCode: conn.lastErrorCode,
    lastErrorAt: conn.lastErrorAt,
    tokenExpiresAt: conn.tokenExpiresAt,
    connected: conn.status === "connected",
    tokenInvalid: conn.status === "invalid" || conn.status === "expired",
  };
}
