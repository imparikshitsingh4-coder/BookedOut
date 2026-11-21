import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { createBusinessAs, createTestDb, createUser, runAs, type TestDb } from "./helpers/db.ts";

describe("profiles", () => {
  let db: TestDb;
  let alice: string;
  let bob: string;
  let outsider: string;

  before(async () => {
    db = await createTestDb();
    alice = await createUser(db, "alice@example.test", "Alice Owner");
    bob = await createUser(db, "bob@example.test", "Bob Staff");
    outsider = await createUser(db, "outsider@example.test", "Olive Outsider");
    await createBusinessAs(db, alice, "Alice Salon");
  });

  after(async () => {
    await db.close();
  });

  test("a profile is created automatically on sign-up with the full name", async () => {
    const result = await db.query<{ full_name: string }>(
      `select full_name from public.profiles where id = $1`,
      [alice],
    );
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].full_name, "Alice Owner");
  });

  test("a user can read their own profile", async () => {
    const result = await runAs(db, "authenticated", alice, `select full_name from public.profiles where id = $1`, [
      alice,
    ]);
    assert.equal(result.rows.length, 1);
  });

  test("a user cannot read the profile of someone outside their businesses", async () => {
    const result = await runAs(
      db,
      "authenticated",
      outsider,
      `select id from public.profiles where id = any($1::uuid[])`,
      [[alice, bob]],
    );
    assert.equal(result.rows.length, 0);
  });

  test("business colleagues can read each other's profiles", async () => {
    // Alice is the owner, so she may add Bob as staff.
    const businessId = await db.query<{ id: string }>(
      `select id from public.businesses where created_by = $1`,
      [alice],
    );
    await runAs(
      db,
      "authenticated",
      alice,
      `insert into public.business_members (business_id, user_id, role) values ($1, $2, 'staff')`,
      [businessId.rows[0].id, bob],
    );

    const asBob = await runAs(db, "authenticated", bob, `select full_name from public.profiles where id = $1`, [alice]);
    assert.equal(asBob.rows.length, 1, "Bob should see Alice's profile because they share a business");

    const asOutsider = await runAs(
      db,
      "authenticated",
      outsider,
      `select full_name from public.profiles where id = $1`,
      [alice],
    );
    assert.equal(asOutsider.rows.length, 0, "an outsider must still not see Alice's profile");
  });

  test("a user can update their own profile but not somebody else's", async () => {
    const own = await runAs(
      db,
      "authenticated",
      alice,
      `update public.profiles set full_name = 'Alice Updated' where id = $1 returning id`,
      [alice],
    );
    assert.equal(own.rows.length, 1);

    const foreign = await runAs(
      db,
      "authenticated",
      outsider,
      `update public.profiles set full_name = 'Hacked' where id = $1 returning id`,
      [alice],
    );
    assert.equal(foreign.rows.length, 0);

    const check = await db.query<{ full_name: string }>(`select full_name from public.profiles where id = $1`, [alice]);
    assert.equal(check.rows[0].full_name, "Alice Updated");
  });

  test("a user cannot insert a profile row directly", async () => {
    await assert.rejects(
      () =>
        runAs(db, "authenticated", outsider, `insert into public.profiles (id, full_name) values ($1, 'Fake')`, [
          outsider,
        ]),
      /row-level security|permission denied/i,
    );
  });

  test("anonymous requests cannot read profiles", async () => {
    await assert.rejects(() => runAs(db, "anon", null, `select * from public.profiles`), /permission denied/i);
  });
});
