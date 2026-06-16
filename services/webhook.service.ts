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

export async function handleMetaWebhook(
  payload: {
    object: string;
    entry: MetaWebhookEntry[];
  },
  context?: { sourceIp?: string; userAgent?: string }
) {
  if (payload.object !== "page") return;

  const { prisma } = await import("@/lib/prisma");
  const { enqueueLeadProcessing } = await import("@/lib/queue");
  const { findPageByFacebookId } = await import("./facebook.service");

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "leadgen") continue;

      const { leadgen_id, page_id, form_id } = change.value;

      let page = null;
      try {
        page = await findPageByFacebookId(page_id);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Page lookup failed";
        await prisma.webhookEvent.create({
          data: {
            eventType: "leadgen",
            payload: change.value as object,
            status: "failed",
            pageId: page_id,
            formId: form_id,
            leadgenId: leadgen_id,
            lastError: message,
            lastErrorAt: new Date(),
            sourceIp: context?.sourceIp,
            userAgent: context?.userAgent,
          },
        });
        await writeSystemLog({
          level: "error",
          source: "webhook",
          action: "page.lookup_failed",
          message,
          metadata: { pageId: page_id, leadgenId: leadgen_id },
        });
        continue;
      }

      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          userId: page?.userId,
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

      if (!page) {
        await prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            status: "ignored",
            lastError: "Page not connected in LeadFlow",
            lastErrorAt: new Date(),
          },
        });
        continue;
      }

      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: "queued" },
      });

      await enqueueLeadProcessing({
        leadgenId: leadgen_id,
        pageId: page_id,
        formId: form_id,
        webhookEventId: webhookEvent.id,
        userId: page.userId,
      });
    }
  }
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
