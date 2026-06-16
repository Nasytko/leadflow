import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export async function createAuditLog(params: {
  userId?: string;
  action: string;
  resource?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
}) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      metadata: params.metadata ?? {},
      ipAddress: params.ipAddress,
    },
  });
}
