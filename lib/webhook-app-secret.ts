import { prisma } from "@/lib/prisma";

function isPlaceholder(value?: string | null): boolean {
  if (!value) return true;
  return value.startsWith("your-");
}

/** App secret used to verify Meta webhook signatures (platform env first). */
export async function getWebhookAppSecret(): Promise<string | null> {
  const envSecret = process.env.META_APP_SECRET;
  if (envSecret && !isPlaceholder(envSecret)) {
    return envSecret;
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
