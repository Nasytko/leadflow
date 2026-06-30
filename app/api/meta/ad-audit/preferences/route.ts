import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess, apiError, requireCsrf } from "@/lib/api-helpers";

const schema = z.object({
  averageOrderValue: z.number().positive().optional().nullable(),
  profitPerLead: z.number().optional().nullable(),
  useProfit: z.boolean().optional(),
});

type AuditPreferences = {
  averageOrderValue?: number | null;
  profitPerLead?: number | null;
  useProfit?: boolean;
};

function parseAuditPreferences(raw: unknown): AuditPreferences {
  if (!raw || typeof raw !== "object") return {};
  const data = raw as AuditPreferences;
  return {
    averageOrderValue: data.averageOrderValue ?? null,
    profitPerLead: data.profitPerLead ?? null,
    useProfit: data.useProfit ?? false,
  };
}

export async function GET() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const user = await prisma.user.findUnique({
    where: { id: authResult.session.user.id },
    select: { auditPreferences: true },
  });

  return apiSuccess({ preferences: parseAuditPreferences(user?.auditPreferences) });
}

export async function PATCH(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION", "Invalid preferences");
  }

  const current = parseAuditPreferences(
    (
      await prisma.user.findUnique({
        where: { id: authResult.session.user.id },
        select: { auditPreferences: true },
      })
    )?.auditPreferences
  );

  const next = { ...current, ...parsed.data };
  await prisma.user.update({
    where: { id: authResult.session.user.id },
    data: { auditPreferences: next },
  });

  return apiSuccess({ preferences: next });
}
