type NotificationLocale = "ru" | "en";

export type { NotificationLocale };

export type TelegramLeadContext = {
  formName: string;
  name: string;
  phone: string;
  email: string;
  createdTime: string;
  allFields: Record<string, string>;
  pageName?: string | null;
  businessName?: string | null;
  campaignName?: string | null;
  adsetName?: string | null;
  adName?: string | null;
  source?: string;
  leadgenId?: string;
};

export function buildTelegramMessage(
  locale: NotificationLocale,
  params: TelegramLeadContext
): string {
  const {
    formName,
    name,
    phone,
    email,
    createdTime,
    allFields,
    pageName,
    businessName,
    campaignName,
    adsetName,
    adName,
    source,
    leadgenId,
  } = params;

  const standardFields = new Set([
    "full_name", "name", "email", "phone_number", "phone",
    "имя", "телефон", "почта", "email_address",
  ]);

  const additionalFields = Object.entries(allFields)
    .filter(([key]) => !standardFields.has(key.toLowerCase()))
    .map(([key, value]) => `• ${key}: ${escapeHtml(value)}`)
    .join("\n");

  const sourceLabel =
    source === "manual_import"
      ? locale === "en"
        ? "Historical import"
        : "Исторический импорт"
      : locale === "en"
      ? "Webhook (real-time)"
      : "Webhook (real-time)";

  const attribution = [
    pageName ? (locale === "en" ? `📄 Page: ${escapeHtml(pageName)}` : `📄 Страница: ${escapeHtml(pageName)}`) : null,
    businessName ? (locale === "en" ? `🏢 Business: ${escapeHtml(businessName)}` : `🏢 Компания: ${escapeHtml(businessName)}`) : null,
    campaignName ? (locale === "en" ? `📣 Campaign: ${escapeHtml(campaignName)}` : `📣 Кампания: ${escapeHtml(campaignName)}`) : null,
    adsetName ? (locale === "en" ? `🎯 Ad set: ${escapeHtml(adsetName)}` : `🎯 Группа объявлений: ${escapeHtml(adsetName)}`) : null,
    adName ? (locale === "en" ? `📢 Ad: ${escapeHtml(adName)}` : `📢 Объявление: ${escapeHtml(adName)}`) : null,
  ].filter(Boolean);

  if (locale === "en") {
    return [
      "🔥 <b>New Facebook Lead</b>",
      "",
      `📋 Form: <b>${escapeHtml(formName)}</b>`,
      ...attribution,
      "",
      `👤 Name: ${escapeHtml(name || "—")}`,
      `📞 Phone: ${escapeHtml(phone || "—")}`,
      `📧 Email: ${escapeHtml(email || "—")}`,
      "",
      `📅 Date: ${escapeHtml(createdTime)}`,
      `🔗 Source: ${escapeHtml(sourceLabel)}`,
      leadgenId ? `🆔 Lead ID: <code>${escapeHtml(leadgenId)}</code>` : null,
      "",
      "📝 <b>Additional Fields:</b>",
      additionalFields || "—",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "🔥 <b>Новый лид Facebook</b>",
    "",
    `📋 Форма: <b>${escapeHtml(formName)}</b>`,
    ...attribution,
    "",
    `👤 Имя: ${escapeHtml(name || "—")}`,
    `📞 Телефон: ${escapeHtml(phone || "—")}`,
    `📧 Email: ${escapeHtml(email || "—")}`,
    "",
    `📅 Дата: ${escapeHtml(createdTime)}`,
    `🔗 Источник: ${escapeHtml(sourceLabel)}`,
    leadgenId ? `🆔 Lead ID: <code>${escapeHtml(leadgenId)}</code>` : null,
    "",
    "📝 <b>Дополнительные поля:</b>",
    additionalFields || "—",
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatLeadCreatedTime(
  createdTime: string,
  locale: NotificationLocale
): string {
  const date = new Date(createdTime);
  return date.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function extractLeadFromFacebookData(data: {
  field_data?: Array<{ name: string; values: string[] }>;
}) {
  const fields: Record<string, string> = {};
  let name = "";
  let phone = "";
  let email = "";

  for (const field of data.field_data ?? []) {
    const value = field.values[0] ?? "";
    fields[field.name] = value;
    const lower = field.name.toLowerCase();
    if (lower.includes("full_name") || lower === "name" || lower.includes("имя")) {
      name = value;
    } else if (lower.includes("phone") || lower.includes("телефон")) {
      phone = value;
    } else if (lower.includes("email") || lower.includes("почта")) {
      email = value;
    }
  }

  return { name, phone, email, fields };
}
