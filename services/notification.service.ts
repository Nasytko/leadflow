import type { TelegramMessageTemplateSettings } from "@/lib/telegram-template-settings";
import { DEFAULT_TELEGRAM_TEMPLATE_SETTINGS } from "@/lib/telegram-template-settings";
import { renderTelegramMessage } from "@/lib/telegram-template-renderer";

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
  params: TelegramLeadContext,
  settings: TelegramMessageTemplateSettings = DEFAULT_TELEGRAM_TEMPLATE_SETTINGS
): string {
  return renderTelegramMessage(locale, params, settings).html;
}

export function buildTelegramMessageWithButtons(
  locale: NotificationLocale,
  params: TelegramLeadContext,
  settings: TelegramMessageTemplateSettings = DEFAULT_TELEGRAM_TEMPLATE_SETTINGS
) {
  return renderTelegramMessage(locale, params, settings);
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
