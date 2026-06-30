import type { TelegramTemplateId } from "@/lib/telegram-template-settings";

export type TelegramTemplateDefinition = {
  id: TelegramTemplateId;
  nameKey: string;
  descriptionKey: string;
  badgeKey?: string;
  icon: string;
  premium: boolean;
  defaultFields: Partial<Record<string, boolean>>;
  defaultStyling: {
    useEmoji: boolean;
    minimal: boolean;
    dividers: boolean;
    emptyLines: boolean;
  };
};

export const TELEGRAM_MESSAGE_TEMPLATES: TelegramTemplateDefinition[] = [
  {
    id: "classic",
    nameKey: "templates.classic.name",
    descriptionKey: "templates.classic.description",
    badgeKey: "templates.classic.badge",
    icon: "📋",
    premium: false,
    defaultFields: {
      formName: true,
      name: true,
      phone: true,
      email: true,
      campaign: true,
      ad: true,
      time: true,
      source: true,
    },
    defaultStyling: {
      useEmoji: true,
      minimal: true,
      dividers: true,
      emptyLines: true,
    },
  },
  {
    id: "business",
    nameKey: "templates.business.name",
    descriptionKey: "templates.business.description",
    badgeKey: "templates.business.badge",
    icon: "💼",
    premium: false,
    defaultFields: {
      formName: true,
      pageName: true,
      name: true,
      phone: true,
      email: true,
      campaign: true,
      adSet: true,
      time: true,
      source: true,
    },
    defaultStyling: {
      useEmoji: false,
      minimal: false,
      dividers: true,
      emptyLines: true,
    },
  },
  {
    id: "sales",
    nameKey: "templates.sales.name",
    descriptionKey: "templates.sales.description",
    badgeKey: "templates.sales.badge",
    icon: "🎯",
    premium: false,
    defaultFields: {
      formName: true,
      name: true,
      phone: true,
      email: true,
      comment: true,
      campaign: true,
      adSet: true,
      ad: true,
      time: true,
      cpl: true,
      source: true,
      leadId: true,
    },
    defaultStyling: {
      useEmoji: true,
      minimal: false,
      dividers: true,
      emptyLines: true,
    },
  },
  {
    id: "compact",
    nameKey: "templates.compact.name",
    descriptionKey: "templates.compact.description",
    badgeKey: "templates.compact.badge",
    icon: "⚡",
    premium: false,
    defaultFields: {
      name: true,
      phone: true,
      formName: true,
      time: true,
    },
    defaultStyling: {
      useEmoji: false,
      minimal: true,
      dividers: false,
      emptyLines: false,
    },
  },
  {
    id: "premium",
    nameKey: "templates.premium.name",
    descriptionKey: "templates.premium.description",
    badgeKey: "templates.premium.badge",
    icon: "✨",
    premium: true,
    defaultFields: {
      formName: true,
      pageName: true,
      name: true,
      phone: true,
      email: true,
      campaign: true,
      ad: true,
      time: true,
      source: true,
    },
    defaultStyling: {
      useEmoji: true,
      minimal: false,
      dividers: true,
      emptyLines: true,
    },
  },
  {
    id: "emoji",
    nameKey: "templates.emoji.name",
    descriptionKey: "templates.emoji.description",
    badgeKey: "templates.emoji.badge",
    icon: "😊",
    premium: false,
    defaultFields: {
      formName: true,
      name: true,
      phone: true,
      email: true,
      time: true,
    },
    defaultStyling: {
      useEmoji: true,
      minimal: true,
      dividers: false,
      emptyLines: true,
    },
  },
];

export function getTelegramTemplate(id: TelegramTemplateId): TelegramTemplateDefinition {
  return (
    TELEGRAM_MESSAGE_TEMPLATES.find((t) => t.id === id) ??
    TELEGRAM_MESSAGE_TEMPLATES[0]
  );
}
