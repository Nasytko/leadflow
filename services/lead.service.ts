import { decrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import {
  enqueueLeadRetry,
  type LeadProcessingJobData,
} from "@/lib/queue";
import { writeSystemLog } from "@/lib/system-log";
import {
  getLeadDetails,
  findPageByFacebookId,
} from "./facebook.service";
import {
  buildTelegramMessage,
  formatLeadCreatedTime,
  extractLeadFromFacebookData,
} from "./notification.service";
import { sendTelegramMessage } from "./telegram.service";
import { extractLeadAttribution } from "@/lib/lead-mapper";

const RETRY_DELAYS = [60_000, 300_000, 900_000];
const SENT_STATUSES = ["success", "sent"];

type DeliveryOutcome = "delivered" | "retrying" | "failed" | "skipped";

async function finalizeWebhookEvent(
  webhookEventId: string | undefined,
  userId: string,
  status: "processed" | "processing" | "ignored" | "failed",
  lastError?: string
) {
  if (!webhookEventId) return;
  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: {
      status,
      userId,
      processedAt: new Date(),
      ...(lastError
        ? { lastError, lastErrorAt: new Date() }
        : { lastError: null, lastErrorCode: null, lastErrorAt: null }),
    },
  });
}

export async function processLeadJob(data: LeadProcessingJobData) {
  const page = await findPageByFacebookId(data.pageId);
  if (!page) {
    throw new Error(`Page not found: ${data.pageId}`);
  }

  if (data.retryDeliveryLogId) {
    const lead = await prisma.lead.findUnique({
      where: {
        userId_leadgenId: {
          userId: page.userId,
          leadgenId: data.leadgenId,
        },
      },
      include: { form: true },
    });
    if (!lead) {
      throw new Error(`Lead not found for retry: ${data.leadgenId}`);
    }
    const fields = (lead.fieldData as Record<string, string>) ?? {};
    await deliverToTelegram(
      page.userId,
      lead.id,
      {
        formName: lead.form?.formName ?? "—",
        name: lead.name ?? "",
        phone: lead.phone ?? "",
        email: lead.email ?? "",
        createdTime: lead.createdTime.toISOString(),
        fields,
      },
      data.retryDeliveryLogId
    );
    return;
  }

  const enabledForm = await prisma.facebookForm.findFirst({
    where: {
      pageId: page.id,
      enabled: true,
      ...(data.formId ? { formId: data.formId } : {}),
    },
  });

  if (!enabledForm) {
    await finalizeWebhookEvent(
      data.webhookEventId,
      page.userId,
      "ignored",
      "Lead form is not enabled"
    );
    return;
  }

  const existingLead = await prisma.lead.findUnique({
    where: {
      userId_leadgenId: {
        userId: page.userId,
        leadgenId: data.leadgenId,
      },
    },
  });

  if (existingLead) {
    const priorDelivery = await prisma.deliveryLog.findFirst({
      where: {
        leadId: existingLead.id,
        status: { in: SENT_STATUSES },
      },
    });
    if (priorDelivery || existingLead.telegramStatus === "sent") {
      await finalizeWebhookEvent(data.webhookEventId, page.userId, "processed");
      return;
    }
  }

  const pageToken = decrypt(page.pageAccessTokenEncrypted);
  const leadData = await getLeadDetails(data.leadgenId, pageToken);
  const { name, phone, email, fields } = extractLeadFromFacebookData(leadData);
  const adFields = extractLeadAttribution(leadData, fields);

  const lead = await prisma.lead.upsert({
    where: {
      userId_leadgenId: {
        userId: page.userId,
        leadgenId: data.leadgenId,
      },
    },
    create: {
      userId: page.userId,
      formId: enabledForm.id,
      leadgenId: data.leadgenId,
      name,
      phone,
      email,
      fieldData: fields,
      rawData: leadData as object,
      createdTime: new Date(leadData.created_time),
      status: "new",
      crmStatus: "new",
      telegramStatus: "pending",
      source: "webhook",
      ...adFields,
    },
    update: {
      formId: enabledForm.id,
      name,
      phone,
      email,
      fieldData: fields,
      rawData: leadData as object,
      ...adFields,
    },
    include: { form: true },
  });

  try {
    const outcome = await deliverToTelegram(page.userId, lead.id, {
      formName: lead.form?.formName ?? enabledForm.formName,
      name: name ?? "",
      phone: phone ?? "",
      email: email ?? "",
      createdTime: leadData.created_time,
      fields,
    });

    if (outcome === "delivered" || outcome === "skipped") {
      await finalizeWebhookEvent(data.webhookEventId, page.userId, "processed");
    } else if (outcome === "retrying") {
      await finalizeWebhookEvent(data.webhookEventId, page.userId, "processing");
    } else {
      await finalizeWebhookEvent(
        data.webhookEventId,
        page.userId,
        "failed",
        "Telegram delivery failed"
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delivery failed";
    await finalizeWebhookEvent(
      data.webhookEventId,
      page.userId,
      "failed",
      message
    );
    await writeSystemLog({
      userId: page.userId,
      level: "error",
      source: "lead",
      action: "delivery.failed",
      message,
      metadata: { leadgenId: data.leadgenId, pageId: data.pageId },
    });
    throw error;
  }
}

async function deliverToTelegram(
  userId: string,
  leadId: string,
  leadInfo: {
    formName: string;
    name: string;
    phone: string;
    email: string;
    createdTime: string;
    fields: Record<string, string>;
  },
  existingDeliveryLogId?: string
): Promise<DeliveryOutcome> {
  const telegram = await prisma.telegramConnection.findUnique({
    where: { userId },
  });

  if (!telegram || telegram.status !== "connected") {
    await prisma.deliveryLog.create({
      data: {
        userId,
        leadId,
        type: "telegram",
        status: "failed",
        errorMessage: "Telegram not connected",
        lastErrorAt: new Date(),
      },
    });
    await prisma.telegramConnection.updateMany({
      where: { userId },
      data: {
        status: "error",
        lastError: "Telegram not connected",
        lastErrorAt: new Date(),
      },
    });
    return "failed";
  }

  const botToken = decrypt(telegram.botTokenEncrypted);
  const locale = (telegram.notificationLocale as "ru" | "en") ?? "ru";

  const message = buildTelegramMessage(locale, {
    formName: leadInfo.formName,
    name: leadInfo.name,
    phone: leadInfo.phone,
    email: leadInfo.email,
    createdTime: formatLeadCreatedTime(leadInfo.createdTime, locale),
    allFields: leadInfo.fields,
  });

  let deliveryLog = existingDeliveryLogId
    ? await prisma.deliveryLog.findFirst({
        where: { id: existingDeliveryLogId, userId },
      })
    : null;

  if (!deliveryLog) {
    const existingSent = await prisma.deliveryLog.findFirst({
      where: { leadId, userId, status: { in: SENT_STATUSES } },
    });
    if (existingSent) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: "delivered", telegramStatus: "sent" },
      });
      return "skipped";
    }

    deliveryLog = await prisma.deliveryLog.create({
      data: {
        userId,
        leadId,
        type: "telegram",
        status: "pending",
        message,
      },
    });
  } else {
    await prisma.deliveryLog.update({
      where: { id: deliveryLog.id },
      data: { status: "retrying" },
    });
  }

  const result = await sendTelegramMessage(botToken, telegram.chatId, message);

  if (result.ok) {
    await prisma.deliveryLog.update({
      where: { id: deliveryLog.id },
      data: {
        status: "sent",
        errorMessage: null,
        lastErrorCode: null,
        lastErrorAt: null,
      },
    });
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "delivered", telegramStatus: "sent" },
    });
    return "delivered";
  }

  const retryCount = deliveryLog.retryCount;
  const retryHistory = (deliveryLog.retryHistory as Array<object>) ?? [];
  retryHistory.push({
    attempt: retryCount + 1,
    error: result.error,
    errorCode: result.errorCode,
    at: new Date().toISOString(),
  });

  if (retryCount < RETRY_DELAYS.length) {
    const delay = RETRY_DELAYS[retryCount];
    await prisma.deliveryLog.update({
      where: { id: deliveryLog.id },
      data: {
        status: "retrying",
        retryCount: retryCount + 1,
        retryHistory,
        errorMessage: result.error,
        lastErrorCode: result.errorCode,
        lastErrorAt: new Date(),
      },
    });

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { form: { include: { page: true } } },
    });

    if (lead) {
      await enqueueLeadRetry(
        {
          leadgenId: lead.leadgenId,
          pageId: lead.form?.page.pageId ?? "",
          retryDeliveryLogId: deliveryLog.id,
          userId,
        },
        delay
      );
    }
    return "retrying";
  } else {
    await prisma.deliveryLog.update({
      where: { id: deliveryLog.id },
      data: {
        status: "failed",
        retryCount: retryCount + 1,
        retryHistory,
        errorMessage: result.error,
        lastErrorCode: result.errorCode,
        lastErrorAt: new Date(),
      },
    });
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "delivery_failed", telegramStatus: "failed" },
    });
    await writeSystemLog({
      userId,
      level: "error",
      source: "telegram",
      action: "send.failed",
      message: result.error ?? "Telegram delivery failed",
      metadata: { leadId, errorCode: result.errorCode },
    });
  }
  return "failed";
}

export type ImportLeadsResult = {
  imported: number;
  skippedDuplicates: number;
  failed: number;
  perFormStats: Array<{
    formId: string;
    formName: string;
    imported: number;
    skipped: number;
    failed: number;
  }>;
};

export async function importLeadsForUser(
  userId: string,
  sendToTelegram: boolean
): Promise<ImportLeadsResult> {
  const forms = await prisma.facebookForm.findMany({
    where: {
      enabled: true,
      page: { userId, connected: true },
    },
    include: { page: true },
  });

  if (forms.length === 0) {
    return { imported: 0, skippedDuplicates: 0, failed: 0, perFormStats: [] };
  }

  let imported = 0;
  let skippedDuplicates = 0;
  let failed = 0;
  const perFormStats: ImportLeadsResult["perFormStats"] = [];

  const { getFormLeads, handleFacebookGraphError, isInvalidOAuthTokenError } =
    await import("./facebook.service");

  for (const form of forms) {
    const pageToken = decrypt(form.page.pageAccessTokenEncrypted);
    let after: string | undefined;
    let formImported = 0;
    let formSkipped = 0;
    let formFailed = 0;

    try {
      do {
        const response = await getFormLeads(form.formId, pageToken, after);
        const leads = response.data ?? [];

        for (const leadData of leads) {
          const existing = await prisma.lead.findUnique({
            where: {
              userId_leadgenId: { userId, leadgenId: leadData.id },
            },
          });

          if (existing) {
            skippedDuplicates++;
            formSkipped++;
            continue;
          }

          try {
            const { name, phone, email, fields } =
              extractLeadFromFacebookData(leadData);
            const adFields = extractLeadAttribution(leadData, fields);

            const lead = await prisma.lead.create({
              data: {
                userId,
                formId: form.id,
                leadgenId: leadData.id,
                name,
                phone,
                email,
                fieldData: fields,
                rawData: leadData as object,
                createdTime: new Date(leadData.created_time),
                status: "imported",
                crmStatus: "new",
                telegramStatus: sendToTelegram ? "pending" : "not_sent",
                source: "manual_import",
                ...adFields,
              },
            });

            imported++;
            formImported++;

            if (sendToTelegram) {
              await deliverToTelegram(userId, lead.id, {
                formName: form.formName,
                name: name ?? "",
                phone: phone ?? "",
                email: email ?? "",
                createdTime: leadData.created_time,
                fields,
              });
            }
          } catch {
            failed++;
            formFailed++;
          }
        }

        after = response.paging?.cursors?.after;
      } while (after);

      perFormStats.push({
        formId: form.formId,
        formName: form.formName,
        imported: formImported,
        skipped: formSkipped,
        failed: formFailed,
      });
    } catch (error) {
      if (isInvalidOAuthTokenError(error)) {
        await handleFacebookGraphError(userId, error);
      }
      throw error;
    }
  }

  return { imported, skippedDuplicates, failed, perFormStats };
}

export async function updateLeadCrmStatus(
  userId: string,
  leadId: string,
  crmStatus:
    | "new"
    | "contacted"
    | "qualified"
    | "converted"
    | "rejected"
    | "in_progress"
    | "processed",
  managerNote?: string
) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
  if (!lead) throw new Error("Lead not found");

  const normalizedStatus =
    crmStatus === "in_progress"
      ? "contacted"
      : crmStatus === "processed"
      ? "converted"
      : crmStatus;

  const legacyStatus =
    normalizedStatus === "converted" && lead.telegramStatus === "sent"
      ? "delivered"
      : normalizedStatus === "new"
      ? lead.source === "manual_import"
        ? "imported"
        : "new"
      : lead.status;

  const touchesPipeline =
    normalizedStatus !== "new" &&
    normalizedStatus !== lead.crmStatus;

  return prisma.lead.update({
    where: { id: leadId },
    data: {
      crmStatus: normalizedStatus,
      status: legacyStatus,
      ...(managerNote !== undefined ? { managerNote } : {}),
      ...(touchesPipeline
        ? { processedAt: new Date(), processedById: userId }
        : normalizedStatus === "new"
        ? { processedAt: null, processedById: null }
        : {}),
    },
  });
}

export async function resendLeadToTelegram(userId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
    include: { form: true },
  });
  if (!lead) throw new Error("Lead not found");

  const fields = (lead.fieldData as Record<string, string>) ?? {};
  await deliverToTelegram(userId, lead.id, {
    formName: lead.form?.formName ?? "—",
    name: lead.name ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    createdTime: lead.createdTime.toISOString(),
    fields,
  });
}

export async function saveLeadFromData(
  userId: string,
  formId: string | null,
  leadData: import("@/types").FacebookLeadData
) {
  const { name, phone, email, fields } = extractLeadFromFacebookData(leadData);

  return prisma.lead.upsert({
    where: {
      userId_leadgenId: { userId, leadgenId: leadData.id },
    },
    create: {
      userId,
      formId,
      leadgenId: leadData.id,
      name,
      phone,
      email,
      fieldData: fields,
      rawData: leadData as object,
      createdTime: new Date(leadData.created_time),
      status: "new",
    },
    update: {
      name,
      phone,
      email,
      fieldData: fields,
      rawData: leadData as object,
    },
  });
}
