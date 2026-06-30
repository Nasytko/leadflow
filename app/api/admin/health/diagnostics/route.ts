import { requireAdmin, checkRateLimit, apiSuccess, requireCsrf } from "@/lib/api-helpers";
import {
  runPlatformHealthChecks,
  saveDiagnosticRun,
} from "@/services/admin/admin-platform-health.service";
import { logAdminAction } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rateLimitError = await checkRateLimit(request, auth.session.user.id);
  if (rateLimitError) return rateLimitError;
  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  const result = await runPlatformHealthChecks();
  const run = await saveDiagnosticRun(auth.session.user.id, result);
  await logAdminAction({
    adminUserId: auth.session.user.id,
    action: "diagnostics_run",
    resource: run.id,
    metadata: { status: result.status },
    request,
  });

  return apiSuccess({ ...result, runId: run.id });
}
