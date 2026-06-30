import { requireAdmin as requireAdminFromHelpers } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export { requireAdminFromHelpers as requireAdmin };

export type AdminContext = {
  userId: string;
  email: string;
  isAdmin: true;
};

export async function getAdminContext() {
  const result = await requireAdminFromHelpers();
  if ("error" in result) return null;
  return {
    userId: result.session.user.id,
    email: result.session.user.email ?? "",
    isAdmin: true as const,
  };
}

export async function logAdminAction(params: {
  adminUserId: string;
  action: string;
  resource?: string;
  metadata?: Prisma.InputJsonValue;
  request?: Request;
}) {
  return createAuditLog({
    userId: params.adminUserId,
    action: params.action,
    resource: params.resource,
    metadata: params.metadata ?? {},
    ipAddress: params.request ? getClientIp(params.request) : undefined,
  });
}

export function maskSecret(value: string | null | undefined, visible = 4): string {
  if (!value) return "";
  if (value.length <= visible) return "••••";
  return `${value.slice(0, visible)}${"•".repeat(8)}`;
}

export function configuredStatus(present: boolean): "configured" | "missing" {
  return present ? "configured" : "missing";
}
