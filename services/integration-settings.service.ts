import { encrypt, hashToken } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { getRedirectUri, getWebhookUrl } from "@/lib/env";
import { showAdvancedMetaSettings, getDeploymentMode } from "@/lib/deployment";
import {
  validateMetaLoginConfigIdInput,
  isValidMetaLoginConfigId,
  normalizeMetaLoginConfigId,
} from "@/lib/meta-login-config";
import {
  getEnvLoginConfigIdNormalized,
  getEnvLoginConfigIdRaw,
  getValidMetaLoginConfigId,
  resolveOAuthMetaCredentialsFromSettings,
  getPlatformCredentialsStatus,
  isSaasDeployment,
  getEnvMetaAppId,
  getEnvMetaAppSecret,
  cleanupLegacyMetaSettingsInDb,
} from "@/lib/meta-platform-credentials";
import { resetFacebookConnection } from "@/services/facebook.service";
import { META_GRAPH_API_BASE } from "@/lib/facebook-graph-config";

export type MetaCredentials = {
  appId: string;
  appSecret: string;
  webhookVerifyToken?: string;
};

export {
  getDeploymentMode,
  getPlatformCredentialsStatus,
  cleanupLegacyMetaSettingsInDb,
  getValidMetaLoginConfigId,
};

export { getRedirectUri, getWebhookUrl };

/** OAuth / platform Meta credentials — SaaS uses env only; self-hosted may use DB. */
export async function getMetaCredentials(
  userId: string
): Promise<MetaCredentials | null> {
  const settings = await prisma.integrationSettings.findUnique({
    where: { userId },
    select: {
      metaAppId: true,
      metaAppSecretEncrypted: true,
      metaWebhookVerifyTokenEncrypted: true,
    },
  });

  return resolveOAuthMetaCredentialsFromSettings(settings);
}

export async function isMetaConfiguredForUser(userId: string): Promise<boolean> {
  const creds = await getMetaCredentials(userId);
  return !!creds?.appId && !!creds?.appSecret;
}

export async function getIntegrationSettingsPublic(userId: string) {
  const status = await getPlatformCredentialsStatus(userId);

  return {
    metaAppId: status.appId.activeValue ?? "",
    metaLoginConfigId: status.loginConfig.value ?? "",
    hasMetaLoginConfigId: !!status.loginConfig.value,
    hasMetaAppSecret: status.appSecret.envPresent || status.appSecret.dbPresent,
    hasWebhookToken:
      status.webhookToken.envPresent || status.webhookToken.dbPresent,
    configured: !!(status.appId.activeValue && status.appSecret.value),
    showAdvancedSettings: showAdvancedMetaSettings(),
    redirectUri: getRedirectUri(),
    webhookUrl: getWebhookUrl(),
    credentialsSource: {
      appId: status.appId.source,
      appSecret: status.appSecret.source,
      loginConfig: status.loginConfig.source,
      legacyDbOverridesInSaas: status.legacyDbOverridesInSaas,
    },
  };
}

/** @deprecated use getEnvLoginConfigIdRaw from meta-platform-credentials */
export function getEnvLoginConfigIdRawReexport(): string | null {
  return getEnvLoginConfigIdRaw();
}

export function getPlatformLoginConfigStatus(): {
  configId: string | null;
  configIdPresent: boolean;
  configIdValid: boolean;
  envRaw: string | null;
  source: "env" | "db" | "none";
} {
  const envRaw = getEnvLoginConfigIdRaw();
  const configId = getEnvLoginConfigIdNormalized();
  return {
    envRaw,
    configId,
    configIdPresent: !!configId,
    configIdValid: configId ? isValidMetaLoginConfigId(configId) : false,
    source: configId ? "env" : "none",
  };
}

export async function getLoginConfigId(userId: string): Promise<string | null> {
  const settings = await prisma.integrationSettings.findUnique({
    where: { userId },
    select: { metaLoginConfigId: true },
  });

  const resolved = getValidMetaLoginConfigId({
    userId,
    dbRawValue: settings?.metaLoginConfigId,
    logIgnored: true,
  });

  return resolved.value;
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
  if (isSaasDeployment()) {
    throw new Error("PLATFORM_MANAGED_META");
  }

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

function isPlaceholder(value?: string | null): boolean {
  if (!value) return true;
  return value.startsWith("your-");
}

export async function verifyWebhookTokenGlobal(token: string): Promise<boolean> {
  const envToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (envToken && !isPlaceholder(envToken) && token === envToken) {
    return true;
  }

  if (isSaasDeployment()) {
    return false;
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
      `${META_GRAPH_API_BASE}/${appId}?fields=id,name&access_token=${appToken}`
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

/** Admin diagnostics: env + DB credential status without secrets. */
export async function getAdminPlatformMetaStatus(userId: string) {
  const status = await getPlatformCredentialsStatus(userId);
  const platformConfig = getPlatformLoginConfigStatus();

  return {
    deploymentMode: status.deploymentMode,
    saasMode: status.saasMode,
    metaAppId: status.appId.activeValue ?? getEnvMetaAppId() ?? "",
    metaAppIdSource: status.appId.source,
    metaAppSecretConfigured: !!status.appSecret.value,
    metaAppSecretEnvPresent: status.appSecret.envPresent,
    metaAppSecretDbPresent: status.appSecret.dbPresent,
    metaAppSecretSource: status.appSecret.source,
    metaAppSecretDbIgnoredInSaas: status.appSecret.dbIgnoredInSaas,
    metaLoginConfigId: status.loginConfig.value,
    metaLoginConfigIdValid: status.loginConfig.valid,
    metaLoginConfigIdSource: status.loginConfig.source,
    metaLoginConfigIdIgnoredLegacy: status.loginConfig.ignoredLegacyValue,
    metaLoginConfigIdEnv: platformConfig.configId,
    webhookVerifyTokenConfigured:
      status.webhookToken.envPresent || status.webhookToken.dbPresent,
    webhookVerifyTokenSource: status.webhookToken.activeSource,
    legacyDbOverridesInSaas: status.legacyDbOverridesInSaas,
  };
}
