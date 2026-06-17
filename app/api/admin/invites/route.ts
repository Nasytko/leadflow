import { prisma } from "@/lib/prisma";
import { requireAdmin, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import { generateSecureToken, hashToken } from "@/lib/encryption";

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const code = generateSecureToken(8);
  const codeHash = hashToken(code);

  await prisma.inviteCode.create({
    data: {
      codeHash,
      createdById: authResult.session.user.id,
    },
  });

  return apiSuccess({ code });
}

