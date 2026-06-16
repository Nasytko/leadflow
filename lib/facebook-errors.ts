export class GraphApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly raw?: unknown
  ) {
    super(message);
    this.name = "GraphApiError";
  }
}

export class InvalidFacebookTokenError extends Error {
  readonly code = "INVALID_FACEBOOK_TOKEN";

  constructor(
    message = "Facebook token is invalid. Please reconnect Facebook."
  ) {
    super(message);
    this.name = "InvalidFacebookTokenError";
  }
}

export function parseGraphApiError(body: string): GraphApiError {
  try {
    const json = JSON.parse(body) as {
      error?: { message?: string; code?: number };
    };
    const err = json.error;
    return new GraphApiError(err?.message ?? body, err?.code, json);
  } catch {
    return new GraphApiError(body);
  }
}

export function isInvalidOAuthTokenError(error: unknown): boolean {
  if (error instanceof GraphApiError) {
    if (error.code === 190) return true;
    const msg = error.message.toLowerCase();
    if (msg.includes("invalid oauth access token")) return true;
    if (msg.includes("error validating access token")) return true;
    if (msg.includes("session has expired")) return true;
    if (msg.includes("oauthexception")) return true;
    if (msg.includes("signature")) return true;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("invalid oauth access token signature") ||
      msg.includes("error validating access token") ||
      msg.includes("session has expired") ||
      msg.includes("oauthexception") ||
      msg.includes('"code":190') ||
      msg.includes("code\":190")
    );
  }
  return false;
}
