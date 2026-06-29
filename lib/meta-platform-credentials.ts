import { decrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import {
  isValidMetaLoginConfigId,
  normalizeMetaLoginConfigId,
} from "@/lib/meta-login-config";
import { showAdvancedMetaSettings, getDeploymentMode } from "@/lib/deployment";
import { writeSystemLog } from "@/lib/system-log";

export type CredentialSource = "env" | "db" | "none";

const warnedInvalidConfigUsers = new Set<string>();

function isPlaceholder(value?: string | null): boolean {
  if (!value) return true;
  return (
    value === "your-meta-app-id" ||
    value === "your-meta-app-secret" ||
    value === "your-webhook-verify-token" ||
    value.startsWith("your-")
  );
}

export function isSaasDeployment(): boolean {
  return !showAdvancedMetaSettings();
}

export function getEnvMetaAppId(): string | null {
  const id = process.env.META_APP_ID?.trim();
  if (!id || isPlaceholder(id)) return null;
  return id;
}

export function getEnvMetaAppSecret(): string | null {
  const secret = process.env.META_APP_SECRET?.trim();
  if (!secret || isPlaceholder(secret)) return null;
  return secret;
}

export function getEnvWebhookVerifyToken(): string | null {
  const token = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  if (!token || isPlaceholder(token)) return null;
  return token;
}

export function getEnvLoginConfigIdRaw(): string | null {
  const id =
    process.env.META_LOGIN_CONFIG_ID ??
    process.env.FACEBOOK_LOGIN_CONFIG_ID ??
    "";
  const trimmed = id?.trim() ?? "";
  if (!trimmed || isPlaceholder(trimmed)) return null;
  return trimmed;
}

/** Valid Login Configuration ID from env only. */
export function getEnvLoginConfigIdNormalized(): string | null {
  return normalizeMetaLoginConfigId(getEnvLoginConfigIdRaw());
}

export type LoginConfigResolution = {
  value: string | null;
  source: CredentialSource;
  valid: boolean;
  envValue: string | null;
  dbRawValue: string | null;
  ignoredLegacyValue: string | null;
};

/**
 * Single source of truth for Facebook Login Configuration ID used in OAuth.
 * SaaS: env only. Self-hosted: DB override if valid, else env.
 */
export function getValidMetaLoginConfigId(input: {
  userId?: string;
  dbRawValue?: string | null;
  logIgnored?: boolean;
}): LoginConfigResolution {
  const envValue = getEnvLoginConfigIdNormalized();
  const dbRaw = input.dbRawValue?.trim() ?? "";
  const dbNormalized = normalizeMetaLoginConfigId(dbRaw);
  const ignoredLegacy = dbRaw && !dbNormalized ? dbRaw : null;

  if (
    input.logIgnored &&
    ignoredLegacy &&
    input.userId &&
    !warnedInvalidConfigUsers.has(input.userId)
  ) {
    warnedInvalidConfigUsers.add(input.userId);
    void writeSystemLog({
      userId: input.userId,
      level: "warn",
      source: "facebook",
      action: "oauth.invalid_config_id_ignored",
      message:
        "Invalid Facebook Login Configuration ID in settings ignored (must be numeric 5–20 digits, not email)",
      metadata: { hasValue: true, length: dbRaw.length },
    });
  }

  if (isSaasDeployment()) {
    return {
      value: envValue,
      source: envValue ? "env" : "none",
      valid: envValue ? isValidMetaLoginConfigId(envValue) : false,
      envValue,
      dbRawValue: dbRaw || null,
      ignoredLegacyValue: ignoredLegacy,
    };
  }

  if (dbNormalized) {
    return {
      value: dbNormalized,
      source: "db",
      valid: true,
      envValue,
      dbRawValue: dbRaw,
      ignoredLegacyValue: null,
    };
  }

  return {
    value: envValue,
    source: envValue ? "env" : "none",
    valid: !!envValue,
    envValue,
    dbRawValue: dbRaw || null,
    ignoredLegacyValue: ignoredLegacy,
  };
}

export type AppSecretResolution = {
  value: string | null;
  source: CredentialSource;
  envPresent: boolean;
  dbPresent: boolean;
  dbIgnoredInSaas: boolean;
};

/** App secret for OAuth token exchange — SaaS uses env only. */
export function getMetaAppSecretForOAuth(
  dbEncrypted?: string | null
): AppSecretResolution {
  const envSecret = getEnvMetaAppSecret();
  const envPresent = !!envSecret;
  const dbPresent = !!dbEncrypted?.trim();

  if (isSaasDeployment()) {
    return {
      value: envSecret,
      source: envSecret ? "env" : "none",
      envPresent,
      dbPresent,
      dbIgnoredInSaas: dbPresent,
    };
  }

  if (dbEncrypted?.trim()) {
    try {
      const decrypted = decrypt(dbEncrypted);
      if (decrypted && !isPlaceholder(decrypted)) {
        return {
          value: decrypted,
          source: "db",
          envPresent,
          dbPresent: true,
          dbIgnoredInSaas: false,
        };
      }
    } catch {
      // fall through to env
    }
  }

  return {
    value: envSecret,
    source: envSecret ? "env" : "none",
    envPresent,
    dbPresent,
    dbIgnoredInSaas: false,
  };
}

export type AppIdResolution = {
  value: string | null;
  source: CredentialSource;
  envPresent: boolean;
  dbPresent: boolean;
  dbIgnoredInSaas: boolean;
};

export function getMetaAppIdForOAuth(dbAppId?: string | null): AppIdResolution {
  const envId = getEnvMetaAppId();
  const envPresent = !!envId;
  const dbPresent = !!(dbAppId?.trim() && !isPlaceholder(dbAppId));

  if (isSaasDeployment()) {
    return {
      value: envId,
      source: envId ? "env" : "none",
      envPresent,
      dbPresent,
      dbIgnoredInSaas: dbPresent,
    };
  }

  if (dbAppId?.trim() && !isPlaceholder(dbAppId)) {
    return {
      value: dbAppId.trim(),
      source: "db",
      envPresent,
      dbPresent: true,
      dbIgnoredInSaas: false,
    };
  }

  return {
    value: envId,
    source: envId ? "env" : "none",
    envPresent,
    dbPresent,
    dbIgnoredInSaas: false,
  };
}

export type OAuthMetaCredentials = {
  appId: string;
  appSecret: string;
  webhookVerifyToken?: string;
};

export function resolveOAuthMetaCredentialsFromSettings(settings: {
  metaAppId?: string | null;
  metaAppSecretEncrypted?: string | null;
  metaWebhookVerifyTokenEncrypted?: string | null;
} | null): OAuthMetaCredentials | null {
  const appId = getMetaAppIdForOAuth(settings?.metaAppId);
  const appSecret = getMetaAppSecretForOAuth(settings?.metaAppSecretEncrypted);

  if (!appId.value || !appSecret.value) {
    return null;
  }

  let webhookVerifyToken: string | undefined;
  const envWebhook = getEnvWebhookVerifyToken();
  if (isSaasDeployment()) {
    webhookVerifyToken = envWebhook ?? undefined;
  } else if (settings?.metaWebhookVerifyTokenEncrypted) {
    try {
      webhookVerifyToken = decrypt(settings.metaWebhookVerifyTokenEncrypted);
    } catch {
      webhookVerifyToken = envWebhook ?? undefined;
    }
  } else {
    webhookVerifyToken = envWebhook ?? undefined;
  }

  return {
    appId: appId.value,
    appSecret: appSecret.value,
    webhookVerifyToken,
  };
}

export type PlatformCredentialsStatus = {
  deploymentMode: string;
  saasMode: boolean;
  appId: AppIdResolution & { activeValue: string | null };
  appSecret: AppSecretResolution;
  loginConfig: LoginConfigResolution;
  webhookToken: {
    envPresent: boolean;
    dbPresent: boolean;
    activeSource: CredentialSource;
  };
  legacyDbOverridesInSaas: boolean;
};

export async function getPlatformCredentialsStatus(
  userId: string
): Promise<PlatformCredentialsStatus> {
  const settings = await prisma.integrationSettings.findUnique({
    where: { userId },
    select: {
      metaAppId: true,
      metaAppSecretEncrypted: true,
      metaLoginConfigId: true,
      metaWebhookVerifyTokenEncrypted: true,
    },
  });

  const appId = getMetaAppIdForOAuth(settings?.metaAppId);
  const appSecret = getMetaAppSecretForOAuth(settings?.metaAppSecretEncrypted);
  const loginConfig = getValidMetaLoginConfigId({
    userId,
    dbRawValue: settings?.metaLoginConfigId,
    logIgnored: true,
  });

  const envWebhook = !!getEnvWebhookVerifyToken();
  const dbWebhook = !!settings?.metaWebhookVerifyTokenEncrypted;

  const legacyDbOverridesInSaas =
    isSaasDeployment() &&
    (appSecret.dbIgnoredInSaas ||
      !!loginConfig.ignoredLegacyValue ||
      (appId.dbIgnoredInSaas && !!settings?.metaAppId));

  return {
    deploymentMode: getDeploymentMode(),
    saasMode: isSaasDeployment(),
    appId: { ...appId, activeValue: appId.value },
    appSecret,
    loginConfig,
    webhookToken: {
      envPresent: envWebhook,
      dbPresent: dbWebhook,
      activeSource: isSaasDeployment()
        ? envWebhook
          ? "env"
          : dbWebhook
            ? "db"
            : "none"
        : dbWebhook
          ? "db"
          : envWebhook
            ? "env"
            : "none",
    },
    legacyDbOverridesInSaas,
  };
}

export async function cleanupLegacyMetaSettingsInDb(): Promise<{
  clearedSecrets: number;
  clearedConfigIds: number;
  clearedAppIds: number;
  rowsUpdated: number;
}> {
  if (!isSaasDeployment()) {
    return {
      clearedSecrets: 0,
      clearedConfigIds: 0,
      clearedAppIds: 0,
      rowsUpdated: 0,
    };
  }

  const rows = await prisma.integrationSettings.findMany({
    select: {
      id: true,
      metaAppSecretEncrypted: true,
      metaLoginConfigId: true,
      metaAppId: true,
    },
  });

  let clearedSecrets = 0;
  let clearedConfigIds = 0;
  let clearedAppIds = 0;
  let rowsUpdated = 0;

  for (const row of rows) {
    const data: {
      metaAppSecretEncrypted?: null;
      metaLoginConfigId?: null;
      metaAppId?: null;
      configured?: boolean;
    } = {};

    if (row.metaAppSecretEncrypted) {
      data.metaAppSecretEncrypted = null;
      clearedSecrets++;
    }

    const rawConfig = row.metaLoginConfigId?.trim() ?? "";
    if (rawConfig) {
      data.metaLoginConfigId = null;
      clearedConfigIds++;
    }

    if (row.metaAppId?.trim() && getEnvMetaAppId()) {
      data.metaAppId = null;
      clearedAppIds++;
    }

    if (Object.keys(data).length > 0) {
      data.configured = false;
      await prisma.integrationSettings.update({
        where: { id: row.id },
        data,
      });
      rowsUpdated++;
    }
  }

  return { clearedSecrets, clearedConfigIds, clearedAppIds, rowsUpdated };
}
