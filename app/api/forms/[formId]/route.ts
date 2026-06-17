import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess, apiError, requireCsrf } from "@/lib/api-helpers";

const schema = z.object({
  enabled: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const { formId } = await params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION", "Invalid input");
  }

  const form = await prisma.facebookForm.findFirst({
    where: {
      id: formId,
      page: { userId: authResult.session.user.id },
    },
  });

  if (!form) {
    return apiError("NOT_FOUND", "Form not found", 404);
  }

  const updated = await prisma.facebookForm.update({
    where: { id: formId },
    data: { enabled: parsed.data.enabled },
  });

  return apiSuccess({ form: updated });
}
