import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isLeadAccessibleByUser,
  tenantLeadWhere,
} from "../lib/lead-tenant";

test("tenantLeadWhere always scopes by userId and leadId", () => {
  assert.deepEqual(tenantLeadWhere("user-a", "lead-1"), {
    id: "lead-1",
    userId: "user-a",
  });
});

test("cross-tenant filter does not match another user's lead", () => {
  const ownerLead = { id: "lead-1", userId: "owner" };
  const intruderFilter = tenantLeadWhere("intruder", "lead-1");

  assert.equal(
    isLeadAccessibleByUser(ownerLead, intruderFilter.userId, intruderFilter.id),
    false
  );
});

test("owner can access their own lead", () => {
  const ownerLead = { id: "lead-1", userId: "owner" };
  const ownerFilter = tenantLeadWhere("owner", "lead-1");

  assert.equal(
    isLeadAccessibleByUser(ownerLead, ownerFilter.userId, ownerFilter.id),
    true
  );
});

test("missing lead is not accessible", () => {
  const filter = tenantLeadWhere("user-a", "lead-missing");
  assert.equal(isLeadAccessibleByUser(null, filter.userId, filter.id), false);
});
