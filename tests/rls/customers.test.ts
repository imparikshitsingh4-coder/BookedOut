import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { createBusinessAs, createTestDb, createUser, runAs, type TestDb } from "./helpers/db.ts";

describe("customers", () => {
  let db: TestDb;
  let owner: string;
  let staff: string;
  let outsider: string;
  let businessId: string;
  let otherBusinessId: string;

  before(async () => {
    db = await createTestDb();
    owner = await createUser(db, "owner@example.test", "Olga Owner");
    staff = await createUser(db, "staff@example.test", "Sam Staff");
    outsider = await createUser(db, "outsider@example.test", "Otto Outsider");

    businessId = await createBusinessAs(db, owner, "Owner Studio");
    otherBusinessId = await createBusinessAs(db, outsider, "Outsider Gym");

    await runAs(
      db,
      "authenticated",
      owner,
      `insert into public.business_members (business_id, user_id, role) values ($1, $2, 'staff')`,
      [businessId, staff],
    );
  });

  after(async () => {
    await db.close();
  });

  test("a member can add a customer attributed to themselves", async () => {
    const result = await runAs(
      db,
      "authenticated",
      staff,
      `insert into public.customers (business_id, full_name, email, created_by)
       values ($1, 'Casey Client', 'casey@example.test', $2) returning id`,
      [businessId, staff],
    );
    assert.equal(result.rows.length, 1);
  });

  test("a customer cannot be created in a business the user does not belong to", async () => {
    await assert.rejects(
      () =>
        runAs(
          db,
          "authenticated",
          staff,
          `insert into public.customers (business_id, full_name, created_by) values ($1, 'Sneaky', $2)`,
          [otherBusinessId, staff],
        ),
      /row-level security/i,
    );
  });

  test("a customer cannot be attributed to another user", async () => {
    await assert.rejects(
      () =>
        runAs(
          db,
          "authenticated",
          staff,
          `insert into public.customers (business_id, full_name, created_by) values ($1, 'Framed', $2)`,
          [businessId, owner],
        ),
      /row-level security/i,
    );
  });

  test("customers are invisible to members of other businesses", async () => {
    const asOwner = await runAs(db, "authenticated", owner, `select id from public.customers where business_id = $1`, [
      businessId,
    ]);
    assert.equal(asOwner.rows.length, 1);

    const asOutsider = await runAs(db, "authenticated", outsider, `select id from public.customers`);
    assert.equal(asOutsider.rows.length, 0, "the outsider must not see any customer of another business");

    const foreign = await runAs(
      db,
      "authenticated",
      outsider,
      `select id from public.customers where business_id = $1`,
      [businessId],
    );
    assert.equal(foreign.rows.length, 0);
  });

  test("staff can update but not delete customers", async () => {
    const customer = await db.query<{ id: string }>(`select id from public.customers where business_id = $1`, [
      businessId,
    ]);
    const customerId = customer.rows[0].id;

    const update = await runAs(
      db,
      "authenticated",
      staff,
      `update public.customers set notes = 'Prefers mornings' where id = $1 returning id`,
      [customerId],
    );
    assert.equal(update.rows.length, 1);

    const remove = await runAs(db, "authenticated", staff, `delete from public.customers where id = $1 returning id`, [
      customerId,
    ]);
    assert.equal(remove.rows.length, 0);
  });

  test("owners can delete customers", async () => {
    const created = await runAs(
      db,
      "authenticated",
      owner,
      `insert into public.customers (business_id, full_name, created_by) values ($1, 'Temp Client', $2) returning id`,
      [businessId, owner],
    );
    const customerId = (created.rows[0] as { id: string }).id;

    const removed = await runAs(
      db,
      "authenticated",
      owner,
      `delete from public.customers where id = $1 returning id`,
      [customerId],
    );
    assert.equal(removed.rows.length, 1);
  });

  test("a duplicate email is rejected within one business only", async () => {
    await assert.rejects(
      () =>
        runAs(
          db,
          "authenticated",
          owner,
          `insert into public.customers (business_id, full_name, email, created_by)
           values ($1, 'Casey Again', 'CASEY@example.test', $2)`,
          [businessId, owner],
        ),
      /duplicate key value/i,
    );

    const elsewhere = await runAs(
      db,
      "authenticated",
      outsider,
      `insert into public.customers (business_id, full_name, email, created_by)
       values ($1, 'Casey Elsewhere', 'casey@example.test', $2) returning id`,
      [otherBusinessId, outsider],
    );
    assert.equal(elsewhere.rows.length, 1, "the same email must be allowed in a different business");
  });

  test("anonymous requests cannot read customers", async () => {
    await assert.rejects(() => runAs(db, "anon", null, `select * from public.customers`), /permission denied/i);
  });
});
