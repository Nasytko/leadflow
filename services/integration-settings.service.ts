import { decrypt, encrypt, hashToken } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { getRedirectUri, getWebhookUrl } from "@/lib/env";

export type MetaCredentials = {
  appId: string;
  appSecret: string;
  webhookVerifyToken?: string;
};

export { getRedirectUri, getWebhookUrl };

function isPlaceholder(value?: string | null): boolean {
  if (!value) return true;
  return (
    value === "your-meta-app-id" ||
    value === "your-meta-app-secret" ||
    value === "your-webhook-verify-token" ||
    value.startsWith("your-")
  );
}

/** Fallback to env for platform operator; prefer per-user DB settings */
export async function getMetaCredentials(
  userId: string
): Promise<MetaCredentials | null> {
  const settings = await prisma.integrationSettings.findUnique({
    where: { userId },
  });

  if (
    settings?.metaAppId &&
    settings.metaAppSecretEncrypted &&
    settings.configured
  ) {
    return {
      appId: settings.metaAppId,
      appSecret: decrypt(settings.metaAppSecretEncrypted),
      webhookVerifyToken: settings.metaWebhookVerifyTokenEncrypted
        ? decrypt(settings.metaWebhookVerifyTokenEncrypted)
        : undefined,
    };
  }

  const envAppId = process.env.META_APP_ID;
  const envSecret = process.env.META_APP_SECRET;
  if (envAppId && envSecret && !isPlaceholder(envAppId) && !isPlaceholder(envSecret)) {
    return {
      appId: envAppId,
      appSecret: envSecret,
      webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN,
    };
  }

  return null;
}

export async function isMetaConfiguredForUser(userId: string): Promise<boolean> {
  const creds = await getMetaCredentials(userId);
  return !!creds?.appId && !!creds?.appSecret;
}

export async function getIntegrationSettingsPublic(userId: string) {
  const settings = await prisma.integrationSettings.findUnique({
    where: { userId },
  });

  return {
    metaAppId: settings?.metaAppId ?? "",
    hasMetaAppSecret: !!settings?.metaAppSecretEncrypted,
    hasWebhookToken: !!settings?.metaWebhookVerifyTokenEncrypted,
    configured: settings?.configured ?? false,
    redirectUri: getRedirectUri(),
    webhookUrl: getWebhookUrl(),
  };
}

export async function saveIntegrationSettings(
  userId: string,
  data: {
    metaAppId: string;
    metaAppSecret?: string;
    metaWebhookVerifyToken?: string;
  }
) {
  const existing = await prisma.integrationSettings.findUnique({
    where: { userId },
  });

  const updateData: Record<string, unknown> = {
    metaAppId: data.metaAppId.trim(),
    configured: true,
  };

  if (data.metaAppSecret?.trim()) {
    updateData.metaAppSecretEncrypted = encrypt(data.metaAppSecret.trim());
  } else if (!existing?.metaAppSecretEncrypted) {
    throw new Error("META_APP_SECRET_REQUIRED");
  }

  if (data.metaWebhookVerifyToken?.trim()) {
    const token = data.metaWebhookVerifyToken.trim();
    updateData.metaWebhookVerifyTokenEncrypted = encrypt(token);
    updateData.metaWebhookVerifyTokenHash = hashToken(token);
  }

  return prisma.integrationSettings.upsert({
    where: { userId },
    create: {
      userId,
      metaAppId: data.metaAppId.trim(),
      metaAppSecretEncrypted: data.metaAppSecret
        ? encrypt(data.metaAppSecret.trim())
        : "",
      metaWebhookVerifyTokenEncrypted: data.metaWebhookVerifyToken
        ? encrypt(data.metaWebhookVerifyToken.trim())
        : undefined,
      metaWebhookVerifyTokenHash: data.metaWebhookVerifyToken
        ? hashToken(data.metaWebhookVerifyToken.trim())
        : undefined,
      configured: true,
    },
    update: updateData,
  });
}

export async function findUserByWebhookVerifyToken(
  token: string
): Promise<string | null> {
  const tokenHash = hashToken(token);
  const settings = await prisma.integrationSettings.findUnique({
    where: { metaWebhookVerifyTokenHash: tokenHash },
  });
  return settings?.userId ?? null;
}

export async function verifyWebhookTokenGlobal(token: string): Promise<boolean> {
  const envToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (envToken && !isPlaceholder(envToken) && token === envToken) {
    return true;
  }

  const userId = await findUserByWebhookVerifyToken(token);
  return !!userId;
}

export async function validateMetaCredentials(
  appId: string,
  appSecret: string
): Promise<{ valid: boolean; appName?: string; error?: string }> {
  try {
    const appToken = `${appId}|${appSecret}`;
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${appId}?fields=id,name&access_token=${appToken}`
    );
    const data = await res.json();
    if (!res.ok || data.error) {
      return { valid: false, error: data.error?.message ?? "Invalid credentials" };
    }
    return { valid: true, appName: data.name };
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : "Validation failed",
    };
  }
}
