export type TelegramTemplateId =
  | "classic"
  | "business"
  | "sales"
  | "compact"
  | "premium"
  | "emoji";

export type TelegramMessageFieldId =
  | "name"
  | "phone"
  | "email"
  | "comment"
  | "formName"
  | "pageName"
  | "campaign"
  | "adSet"
  | "ad"
  | "time"
  | "utm"
  | "cpl"
  | "source"
  | "leadId";

export type TelegramInlineButtonId = "call" | "copyPhone" | "openCrm" | "openAudit";

export type TelegramSignatureMode = "leadbridge" | "none";

export type TelegramMessageStyling = {
  useEmoji: boolean;
  minimal: boolean;
  dividers: boolean;
  emptyLines: boolean;
};

export type TelegramMessageTemplateSettings = {
  templateId: TelegramTemplateId;
  fields: Record<TelegramMessageFieldId, boolean>;
  inlineButtons: Record<TelegramInlineButtonId, boolean>;
  styling: TelegramMessageStyling;
  signature: TelegramSignatureMode;
};

export const DEFAULT_TELEGRAM_FIELDS: Record<TelegramMessageFieldId, boolean> = {
  name: true,
  phone: true,
  email: true,
  comment: true,
  formName: true,
  pageName: true,
  campaign: true,
  adSet: false,
  ad: true,
  time: true,
  utm: false,
  cpl: false,
  source: true,
  leadId: false,
};

export const DEFAULT_TELEGRAM_INLINE_BUTTONS: Record<TelegramInlineButtonId, boolean> = {
  call: true,
  copyPhone: false,
  openCrm: false,
  openAudit: false,
};

export const DEFAULT_TELEGRAM_STYLING: TelegramMessageStyling = {
  useEmoji: true,
  minimal: false,
  dividers: true,
  emptyLines: true,
};

export const DEFAULT_TELEGRAM_TEMPLATE_SETTINGS: TelegramMessageTemplateSettings = {
  templateId: "classic",
  fields: { ...DEFAULT_TELEGRAM_FIELDS },
  inlineButtons: { ...DEFAULT_TELEGRAM_INLINE_BUTTONS },
  styling: { ...DEFAULT_TELEGRAM_STYLING },
  signature: "leadbridge",
};

export function parseTelegramTemplateSettings(
  raw: unknown
): TelegramMessageTemplateSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_TELEGRAM_TEMPLATE_SETTINGS };
  }
  const data = raw as Partial<TelegramMessageTemplateSettings>;
  return {
    templateId: data.templateId ?? "classic",
    fields: { ...DEFAULT_TELEGRAM_FIELDS, ...(data.fields ?? {}) },
    inlineButtons: {
      ...DEFAULT_TELEGRAM_INLINE_BUTTONS,
      ...(data.inlineButtons ?? {}),
    },
    styling: { ...DEFAULT_TELEGRAM_STYLING, ...(data.styling ?? {}) },
    signature: data.signature ?? "leadbridge",
  };
}
