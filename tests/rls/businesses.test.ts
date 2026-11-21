import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { createBusinessAs, createTestDb, createUser, runAs, type TestDb } from "./helpers/db.ts";

describe("businesses and memberships", () => {
  let db: TestDb;
  let owner: string;
  let staff: string;
  let admin: string;
  let outsider: string;
  let businessId: string;

  before(async () => {
    db = await createTestDb();
    owner = await createUser(db, "owner@example.test", "Olga Owner");
    staff = await createUser(db, "staff@example.test", "Sam Staff");
    admin = await createUser(db, "admin@example.test", "Ada Admin");
    outsider = await createUser(db, "outsider@example.test", "Otto Outsider");

    businessId = await createBusinessAs(db, owner, "Owner Studio");

    await runAs(
      db,
      "authenticated",
      owner,
      `insert into public.business_members (business_id, user_id, role) values ($1, $2, 'staff'), ($1, $3, 'admin')`,
      [businessId, staff, admin],
    );
    // Separate business, owned by the outsider, to prove tenant isolation.
    await createBusinessAs(db, outsider, "Outsider Gym");
  });

  after(async () => {
    await db.close();
  });

  test("the creator becomes the owner automatically", async () => {
    const result = await db.query<{ user_id: string; role: string }>(
      `select user_id, role from public.business_members where business_id = $1 and role = 'owner'`,
      [businessId],
    );
    assert.deepEqual(result.rows, [{ user_id: owner, role: "owner" }]);
  });

  test("members can read their business, non-members cannot", async () => {
    const asStaff = await runAs(db, "authenticated", staff, `select id from public.businesses where id = $1`, [
      businessId,
    ]);
    assert.equal(asStaff.rows.length, 1);

    const asOutsider = await runAs(db, "authenticated", outsider, `select id from public.businesses where id = $1`, [
      businessId,
    ]);
    assert.equal(asOutsider.rows.length, 0);
  });

  test("a business cannot be created on behalf of another user", async () => {
    await assert.rejects(
      () =>
        runAs(
          db,
          "authenticated",
          outsider,
          `insert into public.businesses (name, slug, created_by) values ('Spoofed', 'spoofed-business', $1)`,
          [owner],
        ),
      /row-level security/i,
    );
  });

  test("only owners and admins can update a business", async () => {
    const asStaff = await runAs(
      db,
      "authenticated",
      staff,
      `update public.businesses set name = 'Staff Renamed' where id = $1 returning id`,
      [businessId],
    );
    assert.equal(asStaff.rows.length, 0);

    const asAdmin = await runAs(
      db,
      "authenticated",
      admin,
      `update public.businesses set name = 'Admin Renamed' where id = $1 returning id`,
      [businessId],
    );
    assert.equal(asAdmin.rows.length, 1);
  });

  test("a staff member cannot promote themselves to owner", async () => {
    const result = await runAs(
      db,
      "authenticated",
      staff,
      `update public.business_members set role = 'owner' where business_id = $1 and user_id = $2 returning id`,
      [businessId, staff],
    );
    assert.equal(result.rows.length, 0);

    const check = await db.query<{ role: string }>(
      `select role from public.business_members where business_id = $1 and user_id = $2`,
      [businessId, staff],
    );
    assert.equal(check.rows[0].role, "staff");
  });

  test("an admin cannot change the owner's membership row", async () => {
    const result = await runAs(
      db,
      "authenticated",
      admin,
      `update public.business_members set role = 'staff' where business_id = $1 and role = 'owner' returning id`,
      [businessId],
    );
    assert.equal(result.rows.length, 0);
  });

  test("an admin can add staff but not another admin", async () => {
    const newcomer = await createUser(db, "newcomer@example.test", "Nina New");

    const asStaffRole = await runAs(
      db,
      "authenticated",
      admin,
      `insert into public.business_members (business_id, user_id, role) values ($1, $2, 'staff') returning id`,
      [businessId, newcomer],
    );
    assert.equal(asStaffRole.rows.length, 1);

    await assert.rejects(
      () =>
        runAs(
          db,
          "authenticated",
          admin,
          `insert into public.business_members (business_id, user_id, role) values ($1, $2, 'admin') returning id`,
          [businessId, newcomer],
        ),
      /row-level security/i,
    );
  });

  test("a non-member cannot add themselves to a business", async () => {
    const intruder = await createUser(db, "intruder@example.test", "Ivan Intruder");
    await assert.rejects(
      () =>
        runAs(
          db,
          "authenticated",
          intruder,
          `insert into public.business_members (business_id, user_id, role) values ($1, $2, 'owner')`,
          [businessId, intruder],
        ),
      /row-level security/i,
    );
  });

  test("owner rows cannot be deleted, so a business always keeps an owner", async () => {
    const result = await runAs(
      db,
      "authenticated",
      owner,
      `delete from public.business_members where business_id = $1 and role = 'owner' returning id`,
      [businessId],
    );
    assert.equal(result.rows.length, 0);
  });

  test("an outsider cannot delete the business", async () => {
    const result = await runAs(
      db,
      "authenticated",
      outsider,
      `delete from public.businesses where id = $1 returning id`,
      [businessId],
    );
    assert.equal(result.rows.length, 0);
  });

  test("a staff member cannot delete the business, the owner can", async () => {
    const asStaff = await runAs(
      db,
      "authenticated",
      staff,
      `delete from public.businesses where id = $1 returning id`,
      [businessId],
    );
    assert.equal(asStaff.rows.length, 0);

    const tempId = await createBusinessAs(db, owner, "Temp Shop");
    const asOwner = await runAs(db, "authenticated", owner, `delete from public.businesses where id = $1 returning id`, [
      tempId,
    ]);
    assert.equal(asOwner.rows.length, 1);
  });

  test("anonymous requests cannot read businesses", async () => {
    await assert.rejects(() => runAs(db, "anon", null, `select * from public.businesses`), /permission denied/i);
  });
});
