import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/encryption";

export type RegistrationMode = "open" | "invite_only" | "approval_required";

export function getRegistrationMode(): RegistrationMode {
  const mode = (process.env.REGISTRATION_MODE ?? "open").toLowerCase();
  if (mode === "invite_only") return "invite_only";
  if (mode === "approval_required") return "approval_required";
  return "open";
}

export async function consumeInviteCodeInTransaction(
  tx: Prisma.TransactionClient,
  code: string,
  userId: string
) {
  const codeHash = hashToken(code.trim());
  const invite = await tx.inviteCode.findUnique({ where: { codeHash } });
  if (!invite) throw new Error("INVITE_INVALID");
  if (invite.usedAt) throw new Error("INVITE_USED");
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw new Error("INVITE_EXPIRED");
  }

  await tx.inviteCode.update({
    where: { id: invite.id },
    data: { usedById: userId, usedAt: new Date() },
  });
}

/** @deprecated Use consumeInviteCodeInTransaction inside prisma.$transaction */
export async function consumeInviteCode(code: string, userId: string) {
  return consumeInviteCodeInTransaction(prisma, code, userId);
}

export async function createRegisteredUser(params: {
  email: string;
  passwordHash: string;
  name?: string;
  locale: string;
  inviteCode?: string;
}) {
  const mode = getRegistrationMode();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: params.email,
        passwordHash: params.passwordHash,
        name: params.name,
        locale: params.locale,
        status: "pending_email_verification",
      },
    });

    if (mode === "invite_only") {
      await consumeInviteCodeInTransaction(tx, params.inviteCode!, user.id);
    }

    return user;
  });
}
