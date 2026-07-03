export const META_CONNECTION_STATUSES = [
  "connected",
  "needs_reconnect",
  "expired",
  "not_connected",
  "error",
] as const;

export type MetaConnectionStatus = (typeof META_CONNECTION_STATUSES)[number];

export type MetaConnectionSeverity = "ok" | "warning" | "error" | "unknown";

export type MetaConnectionStatusResult = {
  status: MetaConnectionStatus;
  labelKey: string;
  descriptionKey: string;
  severity: MetaConnectionSeverity;
  recommendedActionKey: string;
};

export type MetaConnectionStatusInput = {
  hasConnection: boolean;
  connectionStatus?: string | null;
  uiStatus?: string | null;
  tokenInvalid?: boolean;
  tokenExpiresAt?: Date | string | null;
};

function isTokenExpired(tokenExpiresAt?: Date | string | null): boolean {
  if (!tokenExpiresAt) return false;
  const expires = tokenExpiresAt instanceof Date ? tokenExpiresAt : new Date(tokenExpiresAt);
  if (Number.isNaN(expires.getTime())) return false;
  return expires.getTime() <= Date.now();
}

export function resolveMetaConnectionStatus(
  input: MetaConnectionStatusInput
): MetaConnectionStatusResult {
  const rawStatus = input.connectionStatus ?? "disconnected";
  const uiStatus = input.uiStatus ?? "disconnected";

  if (!input.hasConnection || rawStatus === "disconnected") {
    return {
      status: "not_connected",
      labelKey: "status.not_connected.label",
      descriptionKey: "status.not_connected.description",
      severity: "unknown",
      recommendedActionKey: "actions.connect",
    };
  }

  if (rawStatus === "expired" || isTokenExpired(input.tokenExpiresAt)) {
    return {
      status: "expired",
      labelKey: "status.expired.label",
      descriptionKey: "status.expired.description",
      severity: "error",
      recommendedActionKey: "actions.reconnect",
    };
  }

  if (
    input.tokenInvalid ||
    rawStatus === "invalid" ||
    rawStatus === "error" ||
    uiStatus === "error"
  ) {
    return {
      status: "error",
      labelKey: "status.error.label",
      descriptionKey: "status.error.description",
      severity: "error",
      recommendedActionKey: "actions.reconnect",
    };
  }

  if (
    rawStatus === "pending_pages" ||
    uiStatus === "permissions_missing" ||
    uiStatus === "pages_missing" ||
    uiStatus === "profile_connected"
  ) {
    return {
      status: "needs_reconnect",
      labelKey: "status.needs_reconnect.label",
      descriptionKey: "status.needs_reconnect.description",
      severity: "warning",
      recommendedActionKey: "actions.reconnect",
    };
  }

  if (rawStatus === "connected" && uiStatus === "fully_connected") {
    return {
      status: "connected",
      labelKey: "status.connected.label",
      descriptionKey: "status.connected.description",
      severity: "ok",
      recommendedActionKey: "actions.refresh",
    };
  }

  if (rawStatus === "connected") {
    return {
      status: "needs_reconnect",
      labelKey: "status.needs_reconnect.label",
      descriptionKey: "status.needs_reconnect.description",
      severity: "warning",
      recommendedActionKey: "actions.reconnect",
    };
  }

  return {
    status: "error",
    labelKey: "status.error.label",
    descriptionKey: "status.error.description",
    severity: "error",
    recommendedActionKey: "actions.reconnect",
  };
}

export function resolveTokenStatus(input: {
  tokenExpiresAt?: Date | string | null;
  tokenInvalid?: boolean;
}): MetaConnectionStatusResult {
  if (input.tokenInvalid) {
    return {
      status: "error",
      labelKey: "token.invalid",
      descriptionKey: "token.invalidDesc",
      severity: "error",
      recommendedActionKey: "actions.reconnect",
    };
  }

  if (!input.tokenExpiresAt) {
    return {
      status: "connected",
      labelKey: "token.noExpiry",
      descriptionKey: "token.noExpiryDesc",
      severity: "ok",
      recommendedActionKey: "actions.refresh",
    };
  }

  const expires =
    input.tokenExpiresAt instanceof Date
      ? input.tokenExpiresAt
      : new Date(input.tokenExpiresAt);

  if (Number.isNaN(expires.getTime())) {
    return {
      status: "connected",
      labelKey: "token.unknown",
      descriptionKey: "token.unknownDesc",
      severity: "unknown",
      recommendedActionKey: "actions.refresh",
    };
  }

  if (expires.getTime() <= Date.now()) {
    return {
      status: "expired",
      labelKey: "token.expired",
      descriptionKey: "token.expiredDesc",
      severity: "error",
      recommendedActionKey: "actions.reconnect",
    };
  }

  const daysLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 14) {
    return {
      status: "needs_reconnect",
      labelKey: "token.expiringSoon",
      descriptionKey: "token.expiringSoonDesc",
      severity: "warning",
      recommendedActionKey: "actions.refresh",
    };
  }

  return {
    status: "connected",
    labelKey: "token.valid",
    descriptionKey: "token.validDesc",
    severity: "ok",
    recommendedActionKey: "actions.refresh",
  };
}
