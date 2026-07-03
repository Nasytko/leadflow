/** Tenant-scoped lead query filter used across API routes and services. */
export function tenantLeadWhere(userId: string, leadId: string) {
  return { id: leadId, userId };
}

/** Returns true when a lead row belongs to the requesting user. */
export function isLeadAccessibleByUser(
  lead: { id: string; userId: string } | null | undefined,
  userId: string,
  leadId: string
): boolean {
  return lead?.id === leadId && lead.userId === userId;
}
