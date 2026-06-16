import type { FacebookLeadData } from "@/types";

type NotificationLocale = "ru" | "en";

export function buildTelegramMessage(
  locale: NotificationLocale,
  params: {
    formName: string;
    name: string;
    phone: string;
    email: string;
    createdTime: string;
    allFields: Record<string, string>;
  }
): string {
  const { formName, name, phone, email, createdTime, allFields } = params;

  const standardFields = new Set([
    "full_name", "name", "email", "phone_number", "phone",
    "имя", "телефон", "почта", "email_address",
  ]);

  const additionalFields = Object.entries(allFields)
    .filter(([key]) => !standardFields.has(key.toLowerCase()))
    .map(([key, value]) => `• ${key}: ${value}`)
    .join("\n");

  if (locale === "en") {
    return [
      "🔥 <b>New Facebook Lead</b>",
      "",
      `📋 Form: <b>${escapeHtml(formName)}</b>`,
      "",
      `👤 Name: ${escapeHtml(name || "—")}`,
      `📞 Phone: ${escapeHtml(phone || "—")}`,
      `📧 Email: ${escapeHtml(email || "—")}`,
      "",
      `📅 Date: ${escapeHtml(createdTime)}`,
      "",
      "📝 <b>Additional Fields:</b>",
      additionalFields || "—",
    ].join("\n");
  }

  return [
    "🔥 <b>Новый лид Facebook</b>",
    "",
    `📋 Форма: <b>${escapeHtml(formName)}</b>`,
    "",
    `👤 Имя: ${escapeHtml(name || "—")}`,
    `📞 Телефон: ${escapeHtml(phone || "—")}`,
    `📧 Email: ${escapeHtml(email || "—")}`,
    "",
    `📅 Дата: ${escapeHtml(createdTime)}`,
    "",
    "📝 <b>Дополнительные поля:</b>",
    additionalFields || "—",
  ].join("\n");
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

export function extractLeadFromFacebookData(data: FacebookLeadData) {
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
