import { randomUUID } from "crypto";
import { decrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { writeSystemLog } from "@/lib/system-log";
import { MetaGraphError } from "@/lib/meta-graph-fetch";
import {
  mapLeadImportError,
  leadImportUserMessage,
  type LeadImportErrorResponse,
} from "@/lib/lead-import-errors";
import {
  getFormLeads,
  handleFacebookGraphError,
  isInvalidOAuthTokenError,
  InvalidFacebookTokenError,
} from "@/services/facebook.service";
import {
  buildTelegramMessageWithButtons,
  formatLeadCreatedTime,
  extractLeadFromFacebookData,
} from "@/services/notification.service";
import {
  sendTelegramMessage,
  buildTelegramInlineKeyboard,
} from "@/services/telegram.service";
import { parseTelegramTemplateSettings } from "@/lib/telegram-template-settings";
import { extractLeadAttribution } from "@/lib/lead-mapper";
import { resolveLeadAttributionLinks } from "@/services/meta-ads.service";
import { Prisma } from "@prisma/client";

export type LeadImportSuccessResponse = {
  success: true;
  imported: number;
  duplicates: number;
  failed: number;
  formsProcessed: number;
  telegramSent: number;
  telegramFailed: number;
  message: string;
  perFormStats: Array<{
    formId: string;
    facebookFormId: string;
    formName: string;
    imported: number;
    duplicates: number;
    failed: number;
  }>;
};

export type LeadImportResponse = LeadImportSuccessResponse | LeadImportErrorResponse;

async function logImport(
  action: string,
  userId: string,
  metadata: Record<string, unknown> = {},
  level: "info" | "warn" | "error" = "info"
) {
  await writeSystemLog({
    userId,
    level,
    source: "lead",
    action: `lead_import.${action}`,
    message: action,
    metadata,
  });
}

function successMessage(imported: number, duplicates: number): string {
  if (imported === 0 && duplicates === 0) {
    return "Новых лидов для импорта не найдено";
  }
  if (imported === 0 && duplicates > 0) {
    return `Новых лидов нет. Дубликатов пропущено: ${duplicates}`;
  }
  return `Импорт завершён. Добавлено ${imported} лидов.`;
}

export async function importMetaLeadsForUser(
  userId: string,
  sendToTelegram: boolean
): Promise<LeadImportResponse> {
  const startedAt = Date.now();

  const connection = await prisma.facebookConnection.findUnique({
    where: { userId },
    select: { id: true, status: true },
  });

  if (
    !connection ||
    (connection.status !== "connected" && connection.status !== "pending_pages")
  ) {
    return {
      success: false,
      code: "FACEBOOK_NOT_CONNECTED",
      stage: "validate",
      message: leadImportUserMessage("FACEBOOK_NOT_CONNECTED"),
      adminMessage: "Facebook connection missing or invalid status",
    };
  }

  await logImport("started", userId, {
    connectionId: connection.id,
    sendToTelegram,
    stage: "validate",
  });

  const forms = await prisma.facebookForm.findMany({
    where: {
      enabled: true,
      page: { userId, connected: true },
    },
    include: { page: true },
  });

  if (forms.length === 0) {
    await logImport("finished", userId, {
      connectionId: connection.id,
      formsProcessed: 0,
      imported: 0,
      durationMs: Date.now() - startedAt,
      stage: "select_forms",
    });
    return {
      success: true,
      imported: 0,
      duplicates: 0,
      failed: 0,
      formsProcessed: 0,
      telegramSent: 0,
      telegramFailed: 0,
      message: "Включите синхронизацию хотя бы для одной формы",
      perFormStats: [],
    };
  }

  await logImport("forms_selected", userId, {
    connectionId: connection.id,
    formsCount: forms.length,
    formIds: forms.map((f) => f.id),
    facebookFormIds: forms.map((f) => f.formId),
  });

  let imported = 0;
  let duplicates = 0;
  let failed = 0;
  let telegramSent = 0;
  let telegramFailed = 0;
  const perFormStats: LeadImportSuccessResponse["perFormStats"] = [];

  for (const form of forms) {
    const formStartedAt = Date.now();
    let formImported = 0;
    let formDuplicates = 0;
    let formFailed = 0;
    let after: string | undefined;

    await logImport("form_started", userId, {
      connectionId: connection.id,
      pageId: form.page.pageId,
      formId: form.id,
      facebookFormId: form.formId,
      stage: "fetch_leads",
    });

    const pageToken = decrypt(form.page.pageAccessTokenEncrypted);

    try {
      do {
        await logImport("meta_fetch_started", userId, {
          connectionId: connection.id,
          pageId: form.page.pageId,
          formId: form.id,
          facebookFormId: form.formId,
          after: after ?? null,
          stage: "fetch_leads",
        });

        const fetchStarted = Date.now();
        const response = await getFormLeads(form.formId, pageToken, after, {
          stage: "fetch_leads",
        });
        const leads = response.data ?? [];

        for (const leadData of leads) {
          const existing = await prisma.lead.findUnique({
            where: {
              userId_leadgenId: { userId, leadgenId: leadData.id },
            },
          });

          if (existing) {
            duplicates++;
            formDuplicates++;
            await logImport("lead_duplicate", userId, {
              connectionId: connection.id,
              formId: form.id,
              facebookFormId: form.formId,
              leadgenId: leadData.id,
              stage: "save_lead",
            });
            continue;
          }

          try {
            const { name, phone, email, fields } =
              extractLeadFromFacebookData(leadData);
            const adFields = extractLeadAttribution(leadData, fields);
            const attributionLinks = await resolveLeadAttributionLinks(userId, {
              campaignId: adFields.campaignId,
              adsetId: adFields.adsetId,
              adId: adFields.adId,
              pageDbId: form.page.id,
              businessDbId: form.page.businessId,
            });

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
                ...attributionLinks,
              },
            });

            await prisma.facebookForm.update({
              where: { id: form.id },
              data: { leadCount: { increment: 1 }, lastLeadAt: new Date() },
            });

            imported++;
            formImported++;

            await logImport("lead_saved", userId, {
              connectionId: connection.id,
              formId: form.id,
              facebookFormId: form.formId,
              leadgenId: leadData.id,
              stage: "save_lead",
            });

            if (sendToTelegram) {
              const sent = await trySendImportedLeadToTelegram(
                userId,
                lead.id,
                form,
                leadData,
                fields,
                name,
                phone,
                email
              );
              if (sent) {
                telegramSent++;
                await logImport("telegram_sent", userId, {
                  connectionId: connection.id,
                  formId: form.id,
                  leadgenId: leadData.id,
                  stage: "telegram",
                });
              } else {
                telegramFailed++;
              }
            }
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002"
            ) {
              duplicates++;
              formDuplicates++;
              continue;
            }
            failed++;
            formFailed++;
            await logImport(
              "failed",
              userId,
              {
                connectionId: connection.id,
                formId: form.id,
                facebookFormId: form.formId,
                leadgenId: leadData.id,
                stage: "save_lead",
                errorCode: "SAVE_LEAD_FAILED",
                safeMessage:
                  error instanceof Error ? error.message : "save failed",
              },
              "error"
            );
          }
        }

        await logImport("meta_fetch_finished", userId, {
          connectionId: connection.id,
          formId: form.id,
          facebookFormId: form.formId,
          durationMs: Date.now() - fetchStarted,
          leadsBatch: leads.length,
          stage: "fetch_leads",
        });

        after = response.paging?.cursors?.after;
      } while (after);

      perFormStats.push({
        formId: form.id,
        facebookFormId: form.formId,
        formName: form.formName,
        imported: formImported,
        duplicates: formDuplicates,
        failed: formFailed,
      });

      await logImport("form_finished", userId, {
        connectionId: connection.id,
        formId: form.id,
        facebookFormId: form.formId,
        imported: formImported,
        duplicates: formDuplicates,
        failed: formFailed,
        durationMs: Date.now() - formStartedAt,
        stage: "fetch_leads",
      });
    } catch (error) {
      if (isInvalidOAuthTokenError(error)) {
        await handleFacebookGraphError(userId, error);
      }

      await logImport(
        "meta_fetch_failed",
        userId,
        {
          connectionId: connection.id,
          formId: form.id,
          facebookFormId: form.formId,
          pageId: form.page.pageId,
          stage: "fetch_leads",
          durationMs: Date.now() - formStartedAt,
          errorCode:
            error instanceof MetaGraphError ? error.metaCode : "META_GRAPH",
          safeMessage: error instanceof Error ? error.message : "fetch failed",
        },
        "error"
      );

      if (error instanceof MetaGraphError) {
        return mapLeadImportError(error, "fetch_leads");
      }
      if (error instanceof InvalidFacebookTokenError) {
        return mapLeadImportError(error, "fetch_leads");
      }
      if (isInvalidOAuthTokenError(error)) {
        return mapLeadImportError(
          new InvalidFacebookTokenError(),
          "fetch_leads"
        );
      }

      const errorId = randomUUID();
      await logImport(
        "failed",
        userId,
        {
          connectionId: connection.id,
          formId: form.id,
          errorId,
          stage: "fetch_leads",
          safeMessage: error instanceof Error ? error.message : "unknown",
        },
        "error"
      );
      return mapLeadImportError(error, "fetch_leads", errorId);
    }
  }

  let message = successMessage(imported, duplicates);
  if (sendToTelegram && telegramFailed > 0 && imported > 0) {
    message += ` Telegram: отправлено ${telegramSent}, не удалось ${telegramFailed}.`;
  } else if (sendToTelegram && telegramFailed > 0 && imported === 0) {
    message = "Telegram не подключён. Лиды не импортированы.";
  }

  await logImport("finished", userId, {
    connectionId: connection.id,
    imported,
    duplicates,
    failed,
    formsProcessed: forms.length,
    telegramSent,
    telegramFailed,
    durationMs: Date.now() - startedAt,
    stage: "unknown",
  });

  return {
    success: true,
    imported,
    duplicates,
    failed,
    formsProcessed: forms.length,
    telegramSent,
    telegramFailed,
    message,
    perFormStats,
  };
}

async function trySendImportedLeadToTelegram(
  userId: string,
  leadId: string,
  form: {
    formName: string;
    page: { pageName: string };
  },
  leadData: { created_time: string },
  fields: Record<string, string>,
  name: string | null,
  phone: string | null,
  email: string | null
): Promise<boolean> {
  const telegram = await prisma.telegramConnection.findUnique({
    where: { userId },
  });

  if (!telegram || telegram.status !== "connected") {
    await prisma.lead.update({
      where: { id: leadId },
      data: { telegramStatus: "not_sent" },
    });
    return false;
  }

  const botToken = decrypt(telegram.botTokenEncrypted);
  const locale = (telegram.notificationLocale as "ru" | "en") ?? "ru";
  const templateSettings = parseTelegramTemplateSettings(telegram.messageTemplateSettings);
  const rendered = buildTelegramMessageWithButtons(locale, {
    formName: form.formName,
    name: name ?? "",
    phone: phone ?? "",
    email: email ?? "",
    createdTime: formatLeadCreatedTime(leadData.created_time, locale),
    allFields: fields,
    pageName: form.page.pageName,
    source: "manual_import",
  }, templateSettings);
  const message = rendered.html;

  const result = await sendTelegramMessage(botToken, telegram.chatId, message, {
    inlineKeyboard: buildTelegramInlineKeyboard(rendered.inlineButtons),
  });

  if (result.ok) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "delivered", telegramStatus: "sent" },
    });
    await prisma.deliveryLog.create({
      data: {
        userId,
        leadId,
        type: "telegram",
        status: "sent",
        message,
      },
    });
    return true;
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { telegramStatus: "failed" },
  });
  await prisma.deliveryLog.create({
    data: {
      userId,
      leadId,
      type: "telegram",
      status: "failed",
      errorMessage: result.error ?? "Telegram send failed",
      lastErrorAt: new Date(),
    },
  });
  return false;
}

/** @deprecated Use importMetaLeadsForUser */
export async function importLeadsForUser(
  userId: string,
  sendToTelegram: boolean
) {
  const result = await importMetaLeadsForUser(userId, sendToTelegram);
  if (!result.success) {
    throw new Error(result.message);
  }
  return {
    imported: result.imported,
    skippedDuplicates: result.duplicates,
    failed: result.failed,
    perFormStats: result.perFormStats.map((s) => ({
      formId: s.facebookFormId,
      formName: s.formName,
      imported: s.imported,
      skipped: s.duplicates,
      failed: s.failed,
    })),
  };
}
