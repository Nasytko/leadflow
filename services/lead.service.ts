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
import { resolveLeadAttributionLinks } from "@/services/meta-ads.service";

const RETRY_DELAYS = [60_000, 300_000, 900_000];
const SENT_STATUSES = ["success", "sent"];

type DeliveryOutcome = "delivered" | "retrying" | "failed" | "skipped";

function toTelegramPayload(
  lead: {
    leadgenId: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    createdTime: Date | string;
    source: string;
    campaignName?: string | null;
    adsetName?: string | null;
    adName?: string | null;
    form?: {
      formName: string;
      page?: {
        pageName: string;
        business?: { name: string } | null;
      } | null;
    } | null;
  },
  fields: Record<string, string>,
  createdTimeOverride?: string
) {
  return {
    formName: lead.form?.formName ?? "—",
    name: lead.name ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    createdTime:
      createdTimeOverride ??
      (lead.createdTime instanceof Date
        ? lead.createdTime.toISOString()
        : String(lead.createdTime)),
    fields,
    pageName: lead.form?.page?.pageName ?? null,
    businessName: lead.form?.page?.business?.name ?? null,
    campaignName: lead.campaignName ?? null,
    adsetName: lead.adsetName ?? null,
    adName: lead.adName ?? null,
    source: lead.source,
    leadgenId: lead.leadgenId,
  };
}

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
      include: { form: { include: { page: { include: { business: true } } } } },
    });
    if (!lead) {
      throw new Error(`Lead not found for retry: ${data.leadgenId}`);
    }
    const fields = (lead.fieldData as Record<string, string>) ?? {};
    await deliverToTelegram(
      page.userId,
      lead.id,
      toTelegramPayload(lead, fields),
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
  const attributionLinks = await resolveLeadAttributionLinks(page.userId, {
    campaignId: adFields.campaignId,
    adsetId: adFields.adsetId,
    adId: adFields.adId,
    pageDbId: page.id,
    businessDbId: page.businessId,
  });

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
      ...attributionLinks,
    },
    update: {
      formId: enabledForm.id,
      name,
      phone,
      email,
      fieldData: fields,
      rawData: leadData as object,
      ...adFields,
      ...attributionLinks,
    },
    include: { form: { include: { page: { include: { business: true } } } } },
  });

  if (!existingLead) {
    await prisma.facebookForm.update({
      where: { id: enabledForm.id },
      data: { leadCount: { increment: 1 }, lastLeadAt: new Date() },
    });
  }

  try {
    const outcome = await deliverToTelegram(
      page.userId,
      lead.id,
      toTelegramPayload(lead, fields, leadData.created_time)
    );

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
    pageName?: string | null;
    businessName?: string | null;
    campaignName?: string | null;
    adsetName?: string | null;
    adName?: string | null;
    source?: string;
    leadgenId?: string;
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
    pageName: leadInfo.pageName,
    businessName: leadInfo.businessName,
    campaignName: leadInfo.campaignName,
    adsetName: leadInfo.adsetName,
    adName: leadInfo.adName,
    source: leadInfo.source,
    leadgenId: leadInfo.leadgenId,
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

export { importLeadsForUser, importMetaLeadsForUser } from "./lead-import.service";
export type {
  LeadImportResponse,
  LeadImportSuccessResponse,
} from "./lead-import.service";

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
    include: {
      form: { include: { page: { include: { business: true } } } },
    },
  });
  if (!lead) throw new Error("Lead not found");

  const fields = (lead.fieldData as Record<string, string>) ?? {};
  await deliverToTelegram(userId, lead.id, toTelegramPayload(lead, fields));
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
