import { z } from "zod";
import {
  requireAdmin,
  checkRateLimit,
  apiSuccess,
  apiError,
  requireCsrf,
} from "@/lib/api-helpers";
import {
  listFeatureFlags,
  updateFeatureFlag,
} from "@/services/admin/admin-feature-flags.service";
import { logAdminAction } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rateLimitError = await checkRateLimit(request, auth.session.user.id);
  if (rateLimitError) return rateLimitError;
  const flags = await listFeatureFlags();
  return apiSuccess({ flags });
}

const patchSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
});

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rateLimitError = await checkRateLimit(request, auth.session.user.id);
  if (rateLimitError) return rateLimitError;
  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION", "Invalid input");

  const flag = await updateFeatureFlag(parsed.data.key, parsed.data.enabled);
  await logAdminAction({
    adminUserId: auth.session.user.id,
    action: "feature_flag_changed",
    resource: parsed.data.key,
    metadata: { enabled: parsed.data.enabled },
    request,
  });

  return apiSuccess({ flag });
}
