import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/encryption";

export type RegistrationMode = "open" | "invite_only" | "approval_required";

export function getRegistrationMode(): RegistrationMode {
  const mode = (process.env.REGISTRATION_MODE ?? "open").toLowerCase();
  if (mode === "invite_only") return "invite_only";
  if (mode === "approval_required") return "approval_required";
  return "open";
}

export async function consumeInviteCode(code: string, userId: string) {
  const codeHash = hashToken(code.trim());
  const invite = await prisma.inviteCode.findUnique({ where: { codeHash } });
  if (!invite) throw new Error("INVITE_INVALID");
  if (invite.usedAt) throw new Error("INVITE_USED");
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw new Error("INVITE_EXPIRED");
  }

  await prisma.inviteCode.update({
    where: { id: invite.id },
    data: { usedById: userId, usedAt: new Date() },
  });
}

