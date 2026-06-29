import { MetaGraphError } from "@/lib/meta-graph-fetch";
import { InvalidFacebookTokenError } from "@/lib/facebook-errors";
import { Prisma } from "@prisma/client";

export type LeadImportStage =
  | "validate"
  | "select_forms"
  | "fetch_leads"
  | "save_lead"
  | "telegram"
  | "unknown";

export type LeadImportErrorResponse = {
  success: false;
  code: string;
  stage: LeadImportStage;
  message: string;
  errorId?: string;
  adminMessage?: string;
};

const USER_MESSAGES: Record<string, string> = {
  META_TIMEOUT:
    "Meta временно не ответила. Попробуйте повторить импорт через минуту.",
  META_NETWORK:
    "Не удалось связаться с Meta. Проверьте соединение и повторите импорт.",
  META_RATE_LIMIT:
    "Meta ограничила частоту запросов. Подождите минуту и повторите импорт.",
  META_PERMISSION:
    "Не хватает разрешения leads_retrieval. Переподключите Meta.",
  INVALID_FACEBOOK_TOKEN:
    "Токен Facebook недействителен. Переподключите Meta.",
  FACEBOOK_NOT_CONNECTED: "Facebook не подключён.",
  NO_ENABLED_FORMS:
    "Включите синхронизацию хотя бы для одной формы.",
  FORM_NOT_FOUND: "Форма не найдена.",
  FORM_DISABLED: "Форма отключена для синхронизации.",
  IMPORT_UNEXPECTED:
    "Не удалось завершить импорт. Попробуйте ещё раз или обратитесь в поддержку.",
};

export function leadImportUserMessage(code: string, fallback?: string): string {
  return USER_MESSAGES[code] ?? fallback ?? USER_MESSAGES.IMPORT_UNEXPECTED;
}

export function mapLeadImportError(
  error: unknown,
  stage: LeadImportStage = "unknown",
  errorId?: string
): LeadImportErrorResponse {
  if (error instanceof InvalidFacebookTokenError) {
    return {
      success: false,
      code: "INVALID_FACEBOOK_TOKEN",
      stage,
      message: leadImportUserMessage("INVALID_FACEBOOK_TOKEN"),
      adminMessage: error.message,
    };
  }

  if (error instanceof MetaGraphError) {
    return {
      success: false,
      code: error.metaCode,
      stage: (error.stage ?? stage) as LeadImportStage,
      message: leadImportUserMessage(error.metaCode, error.message),
      adminMessage: error.message,
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return {
      success: false,
      code: "DUPLICATE_LEAD",
      stage: "save_lead",
      message: "Лид уже существует.",
      adminMessage: error.message,
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    code: "IMPORT_UNEXPECTED",
    stage,
    message: leadImportUserMessage("IMPORT_UNEXPECTED"),
    errorId,
    adminMessage: message,
  };
}
