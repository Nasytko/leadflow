import { prisma } from "@/lib/prisma";
import {
  getEnvMetaAppSecret,
  isSaasDeployment,
} from "@/lib/meta-platform-credentials";

function isPlaceholder(value?: string | null): boolean {
  if (!value) return true;
  return value.startsWith("your-");
}

/** App secret used to verify Meta webhook signatures (platform env first). */
export async function getWebhookAppSecret(): Promise<string | null> {
  const envSecret = getEnvMetaAppSecret();
  if (envSecret && !isPlaceholder(envSecret)) {
    return envSecret;
  }

  if (isSaasDeployment()) {
    return null;
  }

  const settings = await prisma.integrationSettings.findFirst({
    where: {
      metaAppSecretEncrypted: { not: null },
      configured: true,
    },
    select: { metaAppSecretEncrypted: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!settings?.metaAppSecretEncrypted) {
    return null;
  }

  const { decrypt } = await import("@/lib/encryption");
  return decrypt(settings.metaAppSecretEncrypted);
}
