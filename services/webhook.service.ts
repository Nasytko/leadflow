import { prisma } from "@/lib/prisma";
import { enqueueLeadProcessing } from "@/lib/queue";
import { verifyWebhookTokenGlobal, findUserByWebhookVerifyToken } from "./integration-settings.service";
import { maskSecret, writeSystemLog } from "@/lib/system-log";

type MetaWebhookEntry = {
  id: string;
  time: number;
  changes: Array<{
    field: string;
    value: {
      leadgen_id: string;
      page_id: string;
      form_id: string;
      created_time: number;
    };
  }>;
};

export async function logWebhookVerification(params: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}) {
  const { prisma } = await import("@/lib/prisma");
  let userId: string | null = null;
  if (params.token) {
    userId = await findUserByWebhookVerifyToken(params.token);
  }

  await prisma.webhookVerificationLog.create({
    data: {
      userId: userId ?? undefined,
      mode: params.mode ?? undefined,
      tokenMasked: params.token ? maskSecret(params.token) : undefined,
      challengePresent: !!params.challenge,
      success: params.success,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      errorMessage: params.errorMessage,
    },
  });

  if (!params.success) {
    await writeSystemLog({
      userId,
      level: "warn",
      source: "webhook",
      action: "verification.failed",
      message: params.errorMessage ?? "Webhook verification failed",
      metadata: {
        mode: params.mode,
        challengePresent: !!params.challenge,
        ipAddress: params.ipAddress,
      },
    });
  }
}

/** Fast path: persist event and enqueue async processing (return 200 quickly). */
export async function handleMetaWebhook(
  payload: {
    object: string;
    entry: MetaWebhookEntry[];
  },
  context?: { sourceIp?: string; userAgent?: string }
) {
  if (payload.object !== "page") return;

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "leadgen") continue;

      const { leadgen_id, page_id, form_id } = change.value;

      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          eventType: "leadgen",
          payload: change.value as object,
          status: "received",
          pageId: page_id,
          formId: form_id,
          leadgenId: leadgen_id,
          sourceIp: context?.sourceIp,
          userAgent: context?.userAgent,
        },
      });

      try {
        await enqueueLeadProcessing({
          leadgenId: leadgen_id,
          pageId: page_id,
          formId: form_id,
          webhookEventId: webhookEvent.id,
        });
        await prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: { status: "queued" },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to enqueue lead job";
        await prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            status: "failed",
            lastError: message,
            lastErrorAt: new Date(),
          },
        });
        throw error;
      }
    }
  }
}

export async function logWebhookSignatureFailure(params: {
  sourceIp?: string;
  userAgent?: string;
  reason: "missing_signature" | "invalid_signature";
}) {
  const { prisma } = await import("@/lib/prisma");

  await prisma.webhookEvent.create({
    data: {
      eventType: "leadgen",
      payload: { error: "signature_invalid", reason: params.reason },
      status: "signature_invalid",
      sourceIp: params.sourceIp,
      userAgent: params.userAgent,
      lastError:
        params.reason === "missing_signature"
          ? "Missing X-Hub-Signature-256 header"
          : "Invalid X-Hub-Signature-256",
      lastErrorAt: new Date(),
    },
  });

  await writeSystemLog({
    level: "warn",
    source: "webhook",
    action: "signature.invalid",
    message: params.reason === "missing_signature"
      ? "Webhook rejected: missing signature"
      : "Webhook rejected: invalid signature",
    metadata: {
      ipAddress: params.sourceIp,
      reason: params.reason,
    },
  });
}

export async function verifyMetaWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null
): Promise<string | null> {
  if (mode !== "subscribe" || !token || !challenge) return null;

  const valid = await verifyWebhookTokenGlobal(token);
  if (valid) return challenge;

  return null;
}
