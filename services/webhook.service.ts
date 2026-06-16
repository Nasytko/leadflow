import { verifyWebhookTokenGlobal } from "./integration-settings.service";

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

export async function handleMetaWebhook(payload: {
  object: string;
  entry: MetaWebhookEntry[];
}) {
  if (payload.object !== "page") return;

  const { prisma } = await import("@/lib/prisma");
  const { enqueueLeadProcessing } = await import("@/lib/queue");
  const { findPageByFacebookId } = await import("./facebook.service");

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "leadgen") continue;

      const { leadgen_id, page_id, form_id } = change.value;
      const page = await findPageByFacebookId(page_id);

      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          userId: page?.userId,
          eventType: "leadgen",
          payload: change.value as object,
          status: "pending",
        },
      });

      await enqueueLeadProcessing({
        leadgenId: leadgen_id,
        pageId: page_id,
        formId: form_id,
        webhookEventId: webhookEvent.id,
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
