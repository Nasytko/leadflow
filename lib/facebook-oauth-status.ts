import { prisma } from "@/lib/prisma";

export type LastOAuthError = {
  safeMessage: string;
  reason: string;
  metaErrorType?: string | null;
  metaErrorCode?: number | null;
  createdAt: string;
  action: string;
};

const OAUTH_FAILED_ACTION = "facebook.oauth.callback.failed";
const OAUTH_SUCCESS_ACTION = "facebook.oauth.connection_saved";

function parseOAuthErrorLog(log: {
  message: string;
  action: string;
  createdAt: Date;
  metadata: unknown;
}): LastOAuthError {
  const meta =
    log.metadata && typeof log.metadata === "object"
      ? (log.metadata as Record<string, unknown>)
      : {};

  const reason =
    typeof meta.errorCode === "string"
      ? meta.errorCode
      : typeof meta.reason === "string"
      ? meta.reason
      : "oauth_failed";

  const safeMessage =
    typeof meta.safeMessage === "string"
      ? meta.safeMessage
      : log.message;

  return {
    safeMessage,
    reason: normalizeOAuthErrorReason(reason),
    metaErrorType:
      typeof meta.metaErrorType === "string" ? meta.metaErrorType : null,
    metaErrorCode:
      typeof meta.metaErrorCode === "number" ? meta.metaErrorCode : null,
    createdAt: log.createdAt.toISOString(),
    action: log.action,
  };
}

/** Normalize legacy / alias error codes for UI mapping. */
export function normalizeOAuthErrorReason(code: string): string {
  if (code === "invalid_client_secret") return "invalid_app_secret";
  if (code.toLowerCase().includes("oauthexception")) return "oauth_exception";
  return code;
}

/**
 * Returns the latest OAuth callback failure unless a successful connection
 * was saved after it (clears stale errors after reconnect).
 */
export async function getLastOAuthError(
  userId: string
): Promise<LastOAuthError | null> {
  const [failedLog, successLog] = await Promise.all([
    prisma.systemLog.findFirst({
      where: {
        userId,
        source: "facebook",
        action: OAUTH_FAILED_ACTION,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.systemLog.findFirst({
      where: {
        userId,
        source: "facebook",
        action: OAUTH_SUCCESS_ACTION,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!failedLog) return null;

  if (successLog && successLog.createdAt > failedLog.createdAt) {
    return null;
  }

  return parseOAuthErrorLog(failedLog);
}
