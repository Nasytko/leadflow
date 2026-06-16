import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess, apiError } from "@/lib/api-helpers";

const profileSchema = z.object({
  name: z.string().optional(),
  locale: z.enum(["ru", "en"]).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const user = await prisma.user.findUnique({
    where: { id: authResult.session.user.id },
    select: { id: true, email: true, name: true, locale: true },
  });

  return apiSuccess({ user });
}

export async function PATCH(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const body = await request.json();

  if (body.currentPassword) {
    const parsed = passwordSchema.safeParse(body);
    if (!parsed.success) return apiError("VALIDATION", "Invalid input");

    const user = await prisma.user.findUnique({
      where: { id: authResult.session.user.id },
    });
    if (!user) return apiError("NOT_FOUND", "User not found", 404);

    const valid = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash
    );
    if (!valid) return apiError("INVALID_PASSWORD", "Current password is wrong");

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return apiSuccess({ passwordUpdated: true });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION", "Invalid input");

  const user = await prisma.user.update({
    where: { id: authResult.session.user.id },
    data: parsed.data,
    select: { id: true, email: true, name: true, locale: true },
  });

  return apiSuccess({ user });
}
