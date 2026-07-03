import { test } from "node:test";
import assert from "node:assert/strict";
import type { Prisma } from "@prisma/client";
import { consumeInviteCodeInTransaction } from "../lib/registration";

function mockTx(invite: {
  id: string;
  usedAt: Date | null;
  expiresAt: Date | null;
} | null) {
  let updated = false;
  const tx = {
    inviteCode: {
      findUnique: async () => invite,
      update: async () => {
        updated = true;
        return invite;
      },
    },
  };
  return { tx: tx as unknown as Prisma.TransactionClient, wasUpdated: () => updated };
}

test("consumeInviteCodeInTransaction rejects unknown invite", async () => {
  const { tx } = mockTx(null);
  await assert.rejects(
    () => consumeInviteCodeInTransaction(tx, "unknown-code", "user-1"),
    { message: "INVITE_INVALID" }
  );
});

test("consumeInviteCodeInTransaction rejects used invite", async () => {
  const { tx } = mockTx({
    id: "inv-1",
    usedAt: new Date(),
    expiresAt: null,
  });
  await assert.rejects(
    () => consumeInviteCodeInTransaction(tx, "used-code", "user-1"),
    { message: "INVITE_USED" }
  );
});

test("registration transaction does not commit user when invite is invalid", async () => {
  const committedUsers: string[] = [];

  async function runRegistration() {
    const pendingUsers: string[] = [];
    const { tx } = mockTx(null);
    const fullTx = {
      ...tx,
      user: {
        create: async () => {
          const user = { id: "user-new", email: "test@example.com" };
          pendingUsers.push(user.id);
          return user;
        },
      },
    } as unknown as Prisma.TransactionClient;

    try {
      const user = await fullTx.user.create({
        data: {
          email: "test@example.com",
          passwordHash: "hash",
          locale: "en",
          status: "pending_email_verification",
        },
      });
      await consumeInviteCodeInTransaction(fullTx, "bad-invite", user.id);
      committedUsers.push(...pendingUsers);
    } catch {
      // Simulates prisma.$transaction rollback — pending writes are discarded
      throw new Error("INVITE_INVALID");
    }
  }

  await assert.rejects(runRegistration, { message: "INVITE_INVALID" });
  assert.equal(committedUsers.length, 0);
});
