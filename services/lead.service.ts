import { decrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import {
  enqueueLeadRetry,
  type LeadProcessingJobData,
} from "@/lib/queue";
import {
  getLeadDetails,
  parseLeadFields,
  findPageByFacebookId,
} from "./facebook.service";
import {
  buildTelegramMessage,
  formatLeadCreatedTime,
  extractLeadFromFacebookData,
} from "./notification.service";
import { sendTelegramMessage } from "./telegram.service";
import type { FacebookLeadData } from "@/types";

const RETRY_DELAYS = [60_000, 300_000, 900_000];

export async function processLeadJob(data: LeadProcessingJobData) {
  const page = await findPageByFacebookId(data.pageId);
  if (!page) {
    throw new Error(`Page not found: ${data.pageId}`);
  }

  const pageToken = decrypt(page.pageAccessTokenEncrypted);
  const leadData = await getLeadDetails(data.leadgenId, pageToken);

  const { name, phone, email, fields } = extractLeadFromFacebookData(leadData);

  const form = data.formId
    ? await prisma.facebookForm.findFirst({
        where: {
          formId: data.formId,
          pageId: page.id,
          enabled: true,
        },
      })
    : await prisma.facebookForm.findFirst({
        where: {
          pageId: page.id,
          enabled: true,
        },
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
      formId: form?.id,
      leadgenId: data.leadgenId,
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
    include: { form: true },
  });

  if (data.webhookEventId) {
    await prisma.webhookEvent.update({
      where: { id: data.webhookEventId },
      data: { status: "processed", processedAt: new Date(), userId: page.userId },
    });
  }

  await deliverToTelegram(page.userId, lead.id, {
    formName: lead.form?.formName ?? "Unknown",
    name: name ?? "",
    phone: phone ?? "",
    email: email ?? "",
    createdTime: leadData.created_time,
    fields,
  }, data.retryDeliveryLogId);
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
) {
  const telegram = await prisma.telegramConnection.findUnique({
    where: { userId },
  });

  if (!telegram?.verified) {
    await prisma.deliveryLog.create({
      data: {
        userId,
        leadId,
        type: "telegram",
        status: "failed",
        errorMessage: "Telegram not connected",
      },
    });
    return;
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
    ? await prisma.deliveryLog.findUnique({ where: { id: existingDeliveryLogId } })
    : null;

  if (!deliveryLog) {
    deliveryLog = await prisma.deliveryLog.create({
      data: {
        userId,
        leadId,
        type: "telegram",
        status: "pending",
        message,
      },
    });
  }

  const result = await sendTelegramMessage(botToken, telegram.chatId, message);

  if (result.ok) {
    await prisma.deliveryLog.update({
      where: { id: deliveryLog.id },
      data: { status: "success" },
    });
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "delivered" },
    });
    return;
  }

  const retryCount = deliveryLog.retryCount;
  const retryHistory = (deliveryLog.retryHistory as Array<object>) ?? [];
  retryHistory.push({
    attempt: retryCount + 1,
    error: result.error,
    at: new Date().toISOString(),
  });

  if (retryCount < RETRY_DELAYS.length) {
    const delay = RETRY_DELAYS[retryCount];
    await prisma.deliveryLog.update({
      where: { id: deliveryLog.id },
      data: {
        status: "pending",
        retryCount: retryCount + 1,
        retryHistory,
        errorMessage: result.error,
      },
    });

    const page = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { form: { include: { page: true } } },
    });

    if (page) {
      await enqueueLeadRetry(
        {
          leadgenId: page.leadgenId,
          pageId: page.form?.page.pageId ?? "",
          retryDeliveryLogId: deliveryLog.id,
          userId,
        },
        delay
      );
    }
  } else {
    await prisma.deliveryLog.update({
      where: { id: deliveryLog.id },
      data: {
        status: "failed",
        retryCount: retryCount + 1,
        retryHistory,
        errorMessage: result.error,
      },
    });
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "delivery_failed" },
    });
  }
}

export async function importLeadsForUser(
  userId: string,
  sendToTelegram: boolean
) {
  const forms = await prisma.facebookForm.findMany({
    where: {
      enabled: true,
      page: { userId, connected: true },
    },
    include: { page: true },
  });

  let imported = 0;

  for (const form of forms) {
    const pageToken = decrypt(form.page.pageAccessTokenEncrypted);
    let after: string | undefined;

    do {
      const { getFormLeads } = await import("./facebook.service");
      const response = await getFormLeads(form.formId, pageToken, after);
      const leads = response.data ?? [];

      for (const leadData of leads) {
        const existing = await prisma.lead.findUnique({
          where: {
            userId_leadgenId: { userId, leadgenId: leadData.id },
          },
        });

        if (existing) continue;

        const { name, phone, email, fields } =
          extractLeadFromFacebookData(leadData);

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
          },
        });

        imported++;

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
      }

      after = response.paging?.cursors?.after;
    } while (after);
  }

  return { imported };
}

export async function saveLeadFromData(
  userId: string,
  formId: string | null,
  leadData: FacebookLeadData
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
