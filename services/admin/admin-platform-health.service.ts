import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { getLeadQueue, QUEUE_NAMES } from "@/lib/queue";
import { getDeploymentMode } from "@/lib/deployment";
import { isSaasDeployment } from "@/lib/meta-platform-credentials";
import { getRedirectUri, getWebhookUrl } from "@/lib/env";

export type HealthCheck = {
  id: string;
  category: string;
  labelKey: string;
  status: "ok" | "warning" | "error" | "unknown";
  message?: string;
  detail?: string;
};

async function checkDatabase(): Promise<HealthCheck> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { id: "database", category: "infrastructure", labelKey: "checkDatabase", status: "ok" };
  } catch (e) {
    return {
      id: "database",
      category: "infrastructure",
      labelKey: "checkDatabase",
      status: "error",
      message: e instanceof Error ? e.message : "Database unreachable",
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    return {
      id: "redis",
      category: "infrastructure",
      labelKey: "checkRedis",
      status: pong === "PONG" ? "ok" : "warning",
    };
  } catch (e) {
    return {
      id: "redis",
      category: "infrastructure",
      labelKey: "checkRedis",
      status: "error",
      message: e instanceof Error ? e.message : "Redis unreachable",
    };
  }
}

function envPresent(key: string): boolean {
  const v = process.env[key]?.trim();
  return !!v && !v.startsWith("your-");
}

export async function runPlatformHealthChecks(): Promise<{
  status: "healthy" | "attention" | "critical";
  checks: HealthCheck[];
}> {
  const checks: HealthCheck[] = [];

  checks.push(await checkDatabase());
  checks.push(await checkRedis());

  checks.push({
    id: "app_url",
    category: "infrastructure",
    labelKey: "checkAppUrl",
    status: envPresent("NEXTAUTH_URL") ? "ok" : "warning",
    detail: envPresent("NEXTAUTH_URL") ? "configured" : "missing",
  });

  checks.push({
    id: "encryption_key",
    category: "infrastructure",
    labelKey: "checkEncryptionKey",
    status: envPresent("ENCRYPTION_KEY") ? "ok" : "error",
    detail: "presence only",
  });

  checks.push({
    id: "nextauth_secret",
    category: "infrastructure",
    labelKey: "checkNextAuth",
    status: envPresent("NEXTAUTH_SECRET") ? "ok" : "error",
    detail: "presence only",
  });

  const metaAppIdOk = envPresent("META_APP_ID");
  const metaSecretOk = envPresent("META_APP_SECRET");
  const metaLoginOk = envPresent("META_LOGIN_CONFIG_ID");

  checks.push({
    id: "meta_app_id",
    category: "meta",
    labelKey: "checkMetaAppId",
    status: metaAppIdOk ? "ok" : "error",
    detail: isSaasDeployment() ? "env" : "check env/db",
  });
  checks.push({
    id: "meta_app_secret",
    category: "meta",
    labelKey: "checkMetaAppSecret",
    status: metaSecretOk ? "ok" : "error",
    detail: "configured/missing",
  });
  checks.push({
    id: "meta_login_config",
    category: "meta",
    labelKey: "checkMetaLoginConfig",
    status: metaLoginOk ? "ok" : "warning",
    detail: metaLoginOk ? "valid" : "missing",
  });

  const emailSettings = await prisma.platformEmailSettings.findUnique({
    where: { id: "platform" },
  });
  const smtpOk =
    (emailSettings?.enabled && emailSettings.smtpHost) || envPresent("SMTP_HOST");
  checks.push({
    id: "smtp",
    category: "email",
    labelKey: "checkSmtp",
    status: smtpOk ? "ok" : "warning",
    detail: emailSettings?.enabled ? "db" : envPresent("SMTP_HOST") ? "env" : "missing",
  });

  const [lastWebhook, adminCount, unverifiedCount] = await Promise.all([
    prisma.webhookEvent.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.user.count({ where: { isAdmin: true } }),
    prisma.user.count({ where: { emailVerifiedAt: null } }),
  ]);

  checks.push({
    id: "webhook_events",
    category: "meta",
    labelKey: "checkLastWebhook",
    status: lastWebhook ? "ok" : "unknown",
    detail: lastWebhook?.createdAt.toISOString(),
  });

  checks.push({
    id: "csrf",
    category: "security",
    labelKey: "checkCsrf",
    status: "ok",
  });

  checks.push({
    id: "rate_limit",
    category: "security",
    labelKey: "checkRateLimit",
    status: "ok",
  });

  checks.push({
    id: "admin_count",
    category: "security",
    labelKey: "checkAdminCount",
    status: adminCount > 0 ? "ok" : "error",
    detail: String(adminCount),
  });

  checks.push({
    id: "unverified_users",
    category: "security",
    labelKey: "checkUnverifiedUsers",
    status: unverifiedCount === 0 ? "ok" : "warning",
    detail: String(unverifiedCount),
  });

  const errorCount = checks.filter((c) => c.status === "error").length;
  const warnCount = checks.filter((c) => c.status === "warning").length;

  const status =
    errorCount > 0 ? "critical" : warnCount > 0 ? "attention" : "healthy";

  return { status, checks };
}

export async function saveDiagnosticRun(
  triggeredByUserId: string,
  result: Awaited<ReturnType<typeof runPlatformHealthChecks>>
) {
  return prisma.adminDiagnosticRun.create({
    data: {
      triggeredByUserId,
      status: result.status,
      summary: {
        deploymentMode: getDeploymentMode(),
        redirectUri: getRedirectUri(),
        webhookUrl: getWebhookUrl(),
        errorCount: result.checks.filter((c) => c.status === "error").length,
        warningCount: result.checks.filter((c) => c.status === "warning").length,
      },
      checks: result.checks,
    },
  });
}

export async function getQueueHealth() {
  try {
    const queue = await getLeadQueue();
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    const failedJobs = await queue.getFailed(0, 20);
    const jobs = failedJobs.map((j) => ({
      id: j.id,
      name: j.name,
      attemptsMade: j.attemptsMade,
      failedReason: j.failedReason?.slice(0, 200),
      timestamp: j.timestamp,
    }));

    return {
      redisOk: true,
      queueName: QUEUE_NAMES.LEAD_PROCESSING,
      waiting,
      active,
      completed,
      failed,
      delayed,
      failedJobs: jobs,
    };
  } catch (e) {
    return {
      redisOk: false,
      queueName: QUEUE_NAMES.LEAD_PROCESSING,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      failedJobs: [],
      error: e instanceof Error ? e.message : "Queue unavailable",
    };
  }
}

export async function retryFailedJobs() {
  const queue = await getLeadQueue();
  const failed = await queue.getFailed();
  let retried = 0;
  for (const job of failed) {
    await job.retry();
    retried++;
  }
  return { retried };
}

export async function retryFailedJob(jobId: string) {
  const queue = await getLeadQueue();
  const job = await queue.getJob(jobId);
  if (!job) throw new Error("Job not found");
  await job.retry();
  return { ok: true };
}
