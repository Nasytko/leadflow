import { decrypt, encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import type { FacebookLeadData } from "@/types";

export {
  getFacebookAuthUrl,
  exchangeCodeForToken,
  getLongLivedToken,
} from "./facebook-auth.service";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

async function graphFetch<T>(
  path: string,
  accessToken: string,
  options?: RequestInit
): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${GRAPH_API_BASE}${path}${separator}access_token=${accessToken}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API error: ${err}`);
  }
  return res.json();
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

export async function saveFacebookConnection(
  userId: string,
  accessToken: string,
  expiresIn?: number,
  facebookUserId?: string
) {
  const encrypted = encrypt(accessToken);
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000)
    : null;

  return prisma.facebookConnection.upsert({
    where: { userId },
    create: {
      userId,
      accessTokenEncrypted: encrypted,
      tokenExpiresAt,
      facebookUserId,
      status: "connected",
    },
    update: {
      accessTokenEncrypted: encrypted,
      tokenExpiresAt,
      facebookUserId,
      status: "connected",
    },
  });
}

export async function getDecryptedUserToken(userId: string): Promise<string | null> {
  const conn = await prisma.facebookConnection.findUnique({ where: { userId } });
  if (!conn) return null;
  return decrypt(conn.accessTokenEncrypted);
}

export async function syncUserPages(userId: string) {
  const token = await getDecryptedUserToken(userId);
  if (!token) throw new Error("Facebook not connected");

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
      },
      update: {
        pageName: page.name,
        pageAccessTokenEncrypted: encrypt(page.access_token),
      },
    });
  }

  return prisma.facebookPage.findMany({
    where: { userId },
    orderBy: { pageName: "asc" },
  });
}

export async function connectPage(userId: string, pageDbId: string) {
  const page = await prisma.facebookPage.findFirst({
    where: { id: pageDbId, userId },
  });
  if (!page) throw new Error("Page not found");

  const pageToken = decrypt(page.pageAccessTokenEncrypted);
  await subscribePageToWebhooks(page.pageId, pageToken);

  return prisma.facebookPage.update({
    where: { id: pageDbId },
    data: { connected: true },
  });
}

export async function disconnectPage(userId: string, pageDbId: string) {
  return prisma.facebookPage.updateMany({
    where: { id: pageDbId, userId },
    data: { connected: false },
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
  return prisma.facebookPage.findFirst({
    where: { pageId: facebookPageId, connected: true },
    include: { user: true },
  });
}
