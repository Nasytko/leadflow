import { prisma } from "@/lib/prisma";

const DEFAULT_FLAGS: Array<{ key: string; description: string; enabled: boolean }> = [
  { key: "meta_audit", description: "Meta Ad Audit", enabled: true },
  { key: "telegram_message_templates", description: "Telegram message templates", enabled: true },
  { key: "premium_templates", description: "Premium templates", enabled: false },
  { key: "ai_recommendations", description: "AI recommendations", enabled: false },
  { key: "user_registration_enabled", description: "User registration", enabled: true },
  { key: "email_verification_required", description: "Email verification required", enabled: true },
  { key: "self_hosted_advanced_settings", description: "Self-hosted advanced settings", enabled: false },
  { key: "debug_mode", description: "Debug mode", enabled: false },
];

export async function ensureFeatureFlags() {
  for (const f of DEFAULT_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      create: { key: f.key, description: f.description, enabled: f.enabled },
      update: {},
    });
  }
}

export async function listFeatureFlags() {
  await ensureFeatureFlags();
  return prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
}

export async function updateFeatureFlag(key: string, enabled: boolean) {
  return prisma.featureFlag.update({
    where: { key },
    data: { enabled },
  });
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  if (!flag) {
    const def = DEFAULT_FLAGS.find((f) => f.key === key);
    return def?.enabled ?? false;
  }
  return flag.enabled;
}
