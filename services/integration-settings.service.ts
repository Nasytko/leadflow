import { decrypt, encrypt, hashToken } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { getRedirectUri, getWebhookUrl } from "@/lib/env";
import { showAdvancedMetaSettings } from "@/lib/deployment";
import {
  normalizeMetaLoginConfigId,
  validateMetaLoginConfigIdInput,
} from "@/lib/meta-login-config";
import { resetFacebookConnection } from "@/services/facebook.service";

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

  const envLoginConfigId = getEnvLoginConfigId();

  const loginConfigId =
    normalizeMetaLoginConfigId(settings?.metaLoginConfigId) ??
    envLoginConfigId;

  return {
    metaAppId: settings?.metaAppId ?? "",
    metaLoginConfigId: loginConfigId ?? "",
    hasMetaLoginConfigId: !!loginConfigId,
    hasMetaAppSecret: !!settings?.metaAppSecretEncrypted,
    hasWebhookToken: !!settings?.metaWebhookVerifyTokenEncrypted,
    configured: settings?.configured ?? false,
    showAdvancedSettings: showAdvancedMetaSettings(),
    redirectUri: getRedirectUri(),
    webhookUrl: getWebhookUrl(),
  };
}

function getEnvLoginConfigId(): string | null {
  const id =
    process.env.META_LOGIN_CONFIG_ID ??
    process.env.FACEBOOK_LOGIN_CONFIG_ID ??
    "";
  if (!id || isPlaceholder(id)) return null;
  return normalizeMetaLoginConfigId(id);
}

export async function getLoginConfigId(userId: string): Promise<string | null> {
  const settings = await prisma.integrationSettings.findUnique({
    where: { userId },
    select: { metaLoginConfigId: true },
  });
  const fromDb = normalizeMetaLoginConfigId(settings?.metaLoginConfigId);
  if (fromDb) return fromDb;
  return getEnvLoginConfigId();
}

export async function saveIntegrationSettings(
  userId: string,
  data: {
    metaAppId: string;
    metaAppSecret?: string;
    metaWebhookVerifyToken?: string;
    metaLoginConfigId?: string;
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

  let nextLoginConfigId: string | null | undefined;
  if (data.metaLoginConfigId !== undefined) {
    const validated = validateMetaLoginConfigIdInput(data.metaLoginConfigId);
    if (!validated.ok) {
      throw new Error(validated.error);
    }
    nextLoginConfigId = validated.value;
    updateData.metaLoginConfigId = validated.value;
  }

  const appIdChanged =
    !!existing?.metaAppId &&
    existing.metaAppId !== data.metaAppId.trim();
  const secretChanged = !!data.metaAppSecret?.trim();
  const loginConfigChanged =
    data.metaLoginConfigId !== undefined &&
    (normalizeMetaLoginConfigId(existing?.metaLoginConfigId) ?? null) !==
      (nextLoginConfigId ?? null);

  if (appIdChanged || secretChanged || loginConfigChanged) {
    await resetFacebookConnection(userId);
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
      metaLoginConfigId:
        data.metaLoginConfigId !== undefined ? (nextLoginConfigId ?? null) : null,
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
