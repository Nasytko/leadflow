import type { NotificationLocale, TelegramLeadContext } from "@/services/notification.service";
import type {
  TelegramMessageTemplateSettings,
  TelegramMessageFieldId,
  TelegramInlineButtonId,
} from "@/lib/telegram-template-settings";
import type { TelegramTemplateId } from "@/lib/telegram-template-settings";
import { getTelegramTemplate } from "@/lib/telegram-message-templates";

export type TelegramInlineButton = {
  id: TelegramInlineButtonId;
  label: string;
  url?: string;
  callbackData?: string;
};

export type RenderedTelegramMessage = {
  html: string;
  plainPreview: string;
  inlineButtons: TelegramInlineButton[];
};

type Labels = {
  header: string;
  form: string;
  name: string;
  phone: string;
  email: string;
  comment: string;
  page: string;
  campaign: string;
  adSet: string;
  ad: string;
  time: string;
  source: string;
  leadId: string;
  cpl: string;
  utm: string;
  additional: string;
  signature: string;
  divider: string;
};

function labels(locale: NotificationLocale): Labels {
  if (locale === "en") {
    return {
      header: "New Facebook Lead",
      form: "Form",
      name: "Name",
      phone: "Phone",
      email: "Email",
      comment: "Comment",
      page: "Page",
      campaign: "Campaign",
      adSet: "Ad set",
      ad: "Ad",
      time: "Date",
      source: "Source",
      leadId: "Lead ID",
      cpl: "CPL",
      utm: "UTM",
      additional: "Additional fields",
      signature: "Sent via ORVIX",
      divider: "────────────",
    };
  }
  return {
    header: "Новый лид Facebook",
    form: "Форма",
    name: "Имя",
    phone: "Телефон",
    email: "Email",
    comment: "Комментарий",
    page: "Страница",
    campaign: "Кампания",
    adSet: "Группа объявлений",
    ad: "Объявление",
    time: "Дата",
    source: "Источник",
    leadId: "ID лида",
    cpl: "CPL",
    utm: "UTM",
    additional: "Дополнительные поля",
    signature: "Отправлено через ORVIX",
    divider: "────────────",
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function divider(styling: TelegramMessageTemplateSettings["styling"], L: Labels): string | null {
  if (!styling.dividers) return null;
  return styling.useEmoji ? `━━ ${L.divider} ━━` : L.divider;
}

function gap(styling: TelegramMessageTemplateSettings["styling"]): string {
  return styling.emptyLines ? "\n" : "";
}

function sourceLabel(locale: NotificationLocale, source?: string): string {
  if (source === "manual_import") {
    return locale === "en" ? "Historical import" : "Исторический импорт";
  }
  return locale === "en" ? "Webhook (real-time)" : "Webhook (real-time)";
}

function fieldLine(
  enabled: boolean,
  emoji: string,
  label: string,
  value: string | null | undefined,
  styling: TelegramMessageTemplateSettings["styling"],
  bold = false
): string | null {
  if (!enabled || value == null || value === "") return null;
  const prefix = styling.useEmoji ? `${emoji} ` : "";
  const val = escapeHtml(value);
  return bold
    ? `${prefix}${label}: <b>${val}</b>`
    : `${prefix}${label}: ${val}`;
}

function buildInlineButtons(
  locale: NotificationLocale,
  settings: TelegramMessageTemplateSettings,
  phone: string
): TelegramInlineButton[] {
  const btns: TelegramInlineButton[] = [];
  const ru = locale === "ru";

  if (settings.inlineButtons.call && phone) {
    btns.push({
      id: "call",
      label: ru ? "📞 Позвонить" : "📞 Call",
      url: `tel:${phone.replace(/\s/g, "")}`,
    });
  }
  if (settings.inlineButtons.copyPhone && phone) {
    btns.push({
      id: "copyPhone",
      label: ru ? "📋 Скопировать телефон" : "📋 Copy phone",
      callbackData: `copy:${phone}`,
    });
  }
  if (settings.inlineButtons.openCrm) {
    btns.push({
      id: "openCrm",
      label: ru ? "🌍 Открыть CRM" : "🌍 Open CRM",
      url: "/leads",
    });
  }
  if (settings.inlineButtons.openAudit) {
    btns.push({
      id: "openAudit",
      label: ru ? "📊 Открыть аудит" : "📊 Open audit",
      url: "/analytics",
    });
  }
  return btns;
}

const standardFields = new Set([
  "full_name", "name", "email", "phone_number", "phone",
  "имя", "телефон", "почта", "email_address",
]);

function additionalFieldsBlock(
  params: TelegramLeadContext,
  locale: NotificationLocale,
  styling: TelegramMessageTemplateSettings["styling"],
  L: Labels
): string | null {
  const lines = Object.entries(params.allFields)
    .filter(([key]) => !standardFields.has(key.toLowerCase()))
    .map(([key, value]) => {
      const prefix = styling.useEmoji ? "• " : "- ";
      return `${prefix}${escapeHtml(key)}: ${escapeHtml(value)}`;
    });
  if (lines.length === 0) return null;
  const header = styling.useEmoji
    ? `📝 <b>${L.additional}:</b>`
    : `<b>${L.additional}:</b>`;
  return [header, ...lines].join("\n");
}

type RendererFn = (
  locale: NotificationLocale,
  params: TelegramLeadContext,
  settings: TelegramMessageTemplateSettings,
  L: Labels
) => string[];

const renderers: Record<TelegramTemplateId, RendererFn> = {
  classic: (locale, params, settings, L) => {
    const d = divider(settings.styling, L);
    const g = gap(settings.styling);
    const src = sourceLabel(locale, params.source);
    return [
      settings.styling.useEmoji ? `🔥 <b>${L.header}</b>` : `<b>${L.header}</b>`,
      g,
      fieldLine(settings.fields.formName, "📋", L.form, params.formName, settings.styling, true),
      fieldLine(settings.fields.pageName, "📄", L.page, params.pageName, settings.styling),
      fieldLine(settings.fields.campaign, "📣", L.campaign, params.campaignName, settings.styling),
      fieldLine(settings.fields.adSet, "🎯", L.adSet, params.adsetName, settings.styling),
      fieldLine(settings.fields.ad, "📢", L.ad, params.adName, settings.styling),
      d,
      g,
      fieldLine(settings.fields.name, "👤", L.name, params.name || "—", settings.styling),
      fieldLine(settings.fields.phone, "📞", L.phone, params.phone || "—", settings.styling),
      fieldLine(settings.fields.email, "📧", L.email, params.email || "—", settings.styling),
      g,
      fieldLine(settings.fields.time, "📅", L.time, params.createdTime, settings.styling),
      fieldLine(settings.fields.source, "🔗", L.source, src, settings.styling),
      settings.fields.leadId && params.leadgenId
        ? `🆔 ${L.leadId}: <code>${escapeHtml(params.leadgenId)}</code>`
        : null,
      g,
      settings.fields.comment ? additionalFieldsBlock(params, locale, settings.styling, L) : null,
    ].filter(Boolean) as string[];
  },

  business: (locale, params, settings, L) => {
    const d = divider(settings.styling, L);
    const g = gap(settings.styling);
    const src = sourceLabel(locale, params.source);
    return [
      `<b>${L.header.toUpperCase()}</b>`,
      d,
      fieldLine(settings.fields.formName, "", L.form, params.formName, settings.styling, true),
      fieldLine(settings.fields.pageName, "", L.page, params.pageName, settings.styling),
      d,
      fieldLine(settings.fields.name, "", L.name, params.name || "—", settings.styling),
      fieldLine(settings.fields.phone, "", L.phone, params.phone || "—", settings.styling),
      fieldLine(settings.fields.email, "", L.email, params.email || "—", settings.styling),
      g,
      fieldLine(settings.fields.campaign, "", L.campaign, params.campaignName, settings.styling),
      fieldLine(settings.fields.adSet, "", L.adSet, params.adsetName, settings.styling),
      fieldLine(settings.fields.ad, "", L.ad, params.adName, settings.styling),
      d,
      fieldLine(settings.fields.time, "", L.time, params.createdTime, settings.styling),
      fieldLine(settings.fields.source, "", L.source, src, settings.styling),
      settings.fields.comment ? additionalFieldsBlock(params, locale, settings.styling, L) : null,
    ].filter(Boolean) as string[];
  },

  sales: (locale, params, settings, L) => {
    const d = divider(settings.styling, L);
    const g = gap(settings.styling);
    const src = sourceLabel(locale, params.source);
    return [
      `🎯 <b>${locale === "en" ? "HOT LEAD" : "ГОРЯЧИЙ ЛИД"}</b>`,
      g,
      fieldLine(settings.fields.formName, "📋", L.form, params.formName, settings.styling, true),
      d,
      fieldLine(settings.fields.name, "👤", L.name, params.name || "—", settings.styling, true),
      fieldLine(settings.fields.phone, "📞", L.phone, params.phone || "—", settings.styling, true),
      fieldLine(settings.fields.email, "📧", L.email, params.email || "—", settings.styling),
      g,
      fieldLine(settings.fields.campaign, "📣", L.campaign, params.campaignName, settings.styling),
      fieldLine(settings.fields.adSet, "🎯", L.adSet, params.adsetName, settings.styling),
      fieldLine(settings.fields.ad, "📢", L.ad, params.adName, settings.styling),
      fieldLine(settings.fields.cpl, "💰", L.cpl, "—", settings.styling),
      g,
      fieldLine(settings.fields.time, "📅", L.time, params.createdTime, settings.styling),
      fieldLine(settings.fields.source, "🔗", L.source, src, settings.styling),
      settings.fields.leadId && params.leadgenId
        ? `🆔 ${L.leadId}: <code>${escapeHtml(params.leadgenId)}</code>`
        : null,
      settings.fields.comment ? additionalFieldsBlock(params, locale, settings.styling, L) : null,
    ].filter(Boolean) as string[];
  },

  compact: (_locale, params, settings, L) => {
    const parts = [
      fieldLine(settings.fields.name, "", L.name, params.name || "—", settings.styling, true),
      fieldLine(settings.fields.phone, "", L.phone, params.phone || "—", settings.styling),
      fieldLine(settings.fields.formName, "", L.form, params.formName, settings.styling),
      fieldLine(settings.fields.time, "", L.time, params.createdTime, settings.styling),
    ].filter(Boolean) as string[];
    return [parts.join(" · ")];
  },

  premium: (locale, params, settings, L) => {
    const d = divider(settings.styling, L);
    const g = gap(settings.styling);
    const src = sourceLabel(locale, params.source);
    return [
      `✨ <b>${L.header}</b> ✨`,
      d,
      fieldLine(settings.fields.formName, "◆", L.form, params.formName, settings.styling, true),
      fieldLine(settings.fields.pageName, "◆", L.page, params.pageName, settings.styling),
      d,
      fieldLine(settings.fields.name, "◆", L.name, params.name || "—", settings.styling),
      fieldLine(settings.fields.phone, "◆", L.phone, params.phone || "—", settings.styling),
      fieldLine(settings.fields.email, "◆", L.email, params.email || "—", settings.styling),
      g,
      fieldLine(settings.fields.campaign, "◆", L.campaign, params.campaignName, settings.styling),
      fieldLine(settings.fields.ad, "◆", L.ad, params.adName, settings.styling),
      d,
      fieldLine(settings.fields.time, "◆", L.time, params.createdTime, settings.styling),
      fieldLine(settings.fields.source, "◆", L.source, src, settings.styling),
      settings.fields.comment ? additionalFieldsBlock(params, locale, settings.styling, L) : null,
    ].filter(Boolean) as string[];
  },

  emoji: (locale, params, settings, L) => {
    const g = gap(settings.styling);
    const src = sourceLabel(locale, params.source);
    return [
      `🎉 <b>${L.header}</b> 🎉`,
      g,
      settings.fields.formName ? `📋 ${escapeHtml(params.formName)}` : null,
      g,
      settings.fields.name ? `👋 ${escapeHtml(params.name || "—")}` : null,
      settings.fields.phone ? `📱 ${escapeHtml(params.phone || "—")}` : null,
      settings.fields.email ? `✉️ ${escapeHtml(params.email || "—")}` : null,
      g,
      settings.fields.time ? `🕐 ${escapeHtml(params.createdTime)}` : null,
      settings.fields.source ? `🔗 ${escapeHtml(src)}` : null,
      settings.fields.comment ? additionalFieldsBlock(params, locale, settings.styling, L) : null,
    ].filter(Boolean) as string[];
  },
};

export function renderTelegramMessage(
  locale: NotificationLocale,
  params: TelegramLeadContext,
  settings: TelegramMessageTemplateSettings
): RenderedTelegramMessage {
  const L = labels(locale);
  const template = getTelegramTemplate(settings.templateId);
  const renderer = renderers[template.id] ?? renderers.classic;
  const lines = renderer(locale, params, settings, L);

  if (settings.signature === "leadbridge") {
    lines.push(gap(settings.styling));
    lines.push(`<i>${L.signature}</i>`);
  }

  const html = lines.join("\n");
  return {
    html,
    plainPreview: stripHtml(html),
    inlineButtons: buildInlineButtons(locale, settings, params.phone),
  };
}

export const SAMPLE_LEAD_CONTEXT: TelegramLeadContext = {
  formName: "Заявка с сайта",
  name: "Анна Петрова",
  phone: "+7 999 123-45-67",
  email: "anna@example.com",
  createdTime: "17 июня 2026, 14:32",
  allFields: {
    full_name: "Анна Петрова",
    phone_number: "+7 999 123-45-67",
    email: "anna@example.com",
    comment: "Интересует консультация в выходные",
  },
  pageName: "ORVIX Demo",
  businessName: "Demo Business",
  campaignName: "Летняя акция",
  adsetName: "Москва 25-45",
  adName: "Баннер v2",
  source: "webhook",
  leadgenId: "12021456789012345",
};

export const TELEGRAM_FIELD_OPTIONS: Array<{
  id: TelegramMessageFieldId;
  labelKey: string;
}> = [
  { id: "name", labelKey: "fields.name" },
  { id: "phone", labelKey: "fields.phone" },
  { id: "email", labelKey: "fields.email" },
  { id: "comment", labelKey: "fields.comment" },
  { id: "formName", labelKey: "fields.formName" },
  { id: "pageName", labelKey: "fields.pageName" },
  { id: "campaign", labelKey: "fields.campaign" },
  { id: "adSet", labelKey: "fields.adSet" },
  { id: "ad", labelKey: "fields.ad" },
  { id: "time", labelKey: "fields.time" },
  { id: "utm", labelKey: "fields.utm" },
  { id: "cpl", labelKey: "fields.cpl" },
  { id: "source", labelKey: "fields.source" },
  { id: "leadId", labelKey: "fields.leadId" },
];

export const TELEGRAM_INLINE_BUTTON_OPTIONS: Array<{
  id: TelegramInlineButtonId;
  labelKey: string;
}> = [
  { id: "call", labelKey: "buttons.call" },
  { id: "copyPhone", labelKey: "buttons.copyPhone" },
  { id: "openCrm", labelKey: "buttons.openCrm" },
  { id: "openAudit", labelKey: "buttons.openAudit" },
];
