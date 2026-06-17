import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";
import {
  updateLeadCrmStatus,
  resendLeadToTelegram,
} from "@/services/lead.service";
import { mapLeadPublic } from "@/lib/lead-mapper";

const patchSchema = z.object({
  action: z.enum([
    "set_in_progress",
    "set_processed",
    "set_rejected",
    "set_new",
    "resend_telegram",
  ]),
  managerNote: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const { leadId } = await params;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: authResult.session.user.id },
    include: {
      form: {
        include: {
          page: { include: { business: true } },
        },
      },
      deliveryLogs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) {
    return apiError("NOT_FOUND", "Lead not found", 404);
  }

  return apiSuccess({ lead: { ...mapLeadPublic(lead), deliveryLogs: lead.deliveryLogs } });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const { leadId } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid request", 400);
  }

  const userId = authResult.session.user.id;

  try {
    if (parsed.data.action === "resend_telegram") {
      await resendLeadToTelegram(userId, leadId);
    } else {
      const statusMap = {
        set_new: "new",
        set_in_progress: "in_progress",
        set_processed: "processed",
        set_rejected: "rejected",
      } as const;
      await updateLeadCrmStatus(
        userId,
        leadId,
        statusMap[parsed.data.action],
        parsed.data.managerNote
      );
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: {
        form: { include: { page: { include: { business: true } } } },
        deliveryLogs: { orderBy: { createdAt: "desc" } },
      },
    });

    return apiSuccess({
      lead: lead ? { ...mapLeadPublic(lead), deliveryLogs: lead.deliveryLogs } : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return apiError("UPDATE_FAILED", message, 500);
  }
}
