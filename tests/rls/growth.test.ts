import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { createBusinessAs, createTestDb, createUser, runAs, type TestDb } from "./helpers/db.ts";

describe("growth tables and platform admin", () => {
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

  test("a new business gets a brand kit, owner membership and a test-mode trial", async () => {
    const kit = await db.query(`select business_id from public.brand_kits where business_id = $1`, [businessId]);
    assert.equal(kit.rows.length, 1);

    const subscription = await db.query<{ plan: string; status: string; provider: string }>(
      `select plan, status, provider from public.subscriptions where business_id = $1`,
      [businessId],
    );
    assert.deepEqual(subscription.rows[0], { plan: "starter", status: "trialing", provider: "test" });
  });

  test("row level security is enabled on every growth table", async () => {
    const tables = [
      "follow_ups",
      "reviews",
      "referrals",
      "campaigns",
      "marketing_posts",
      "brand_kits",
      "designs",
      "subscriptions",
      "platform_admins",
    ];
    const result = await db.query<{ relname: string }>(
      `select c.relname
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relrowsecurity and c.relname = any($1::text[])`,
      [tables],
    );
    assert.deepEqual(result.rows.map((row) => row.relname).sort(), [...tables].sort());
  });

  test("follow-ups are invisible across businesses and cannot be forged", async () => {
    const created = await runAs(
      db,
      "authenticated",
      owner,
      `insert into public.follow_ups (business_id, title, created_by, due_at)
       values ($1, 'Check in', $2, now()) returning id`,
      [businessId, owner],
    );
    assert.equal(created.rows.length, 1);

    await assert.rejects(
      () =>
        runAs(
          db,
          "authenticated",
          owner,
          `insert into public.follow_ups (business_id, title, created_by) values ($1, 'Framed', $2)`,
          [businessId, staff],
        ),
      /row-level security/i,
    );

    await assert.rejects(
      () =>
        runAs(
          db,
          "authenticated",
          outsider,
          `insert into public.follow_ups (business_id, title, created_by) values ($1, 'Intruder', $2)`,
          [businessId, outsider],
        ),
      /row-level security/i,
    );

    const visible = await runAs(db, "authenticated", outsider, `select id from public.follow_ups`);
    assert.equal(visible.rows.length, 0);
  });

  test("staff can update but not delete a follow-up", async () => {
    const row = await db.query<{ id: string }>(`select id from public.follow_ups where business_id = $1`, [businessId]);
    const id = row.rows[0].id;

    const updated = await runAs(
      db,
      "authenticated",
      staff,
      `update public.follow_ups set title = 'Updated by staff' where id = $1 returning id`,
      [id],
    );
    assert.equal(updated.rows.length, 1);

    const removed = await runAs(
      db,
      "authenticated",
      staff,
      `delete from public.follow_ups where id = $1 returning id`,
      [id],
    );
    assert.equal(removed.rows.length, 0);
  });

  test("reviews can be recorded by a member and stay inside the business", async () => {
    const created = await runAs(
      db,
      "authenticated",
      staff,
      `insert into public.reviews (business_id, rating, status, created_by)
       values ($1, 5, 'received', $2) returning id`,
      [businessId, staff],
    );
    assert.equal(created.rows.length, 1);

    const other = await runAs(db, "authenticated", outsider, `select id from public.reviews`);
    assert.equal(other.rows.length, 0);

    const replied = await runAs(
      db,
      "authenticated",
      owner,
      `update public.reviews set response = 'Thank you!', status = 'responded' where business_id = $1 returning id`,
      [businessId],
    );
    assert.equal(replied.rows.length, 1);
  });

  test("a referral code is unique per business, not globally", async () => {
    await runAs(
      db,
      "authenticated",
      owner,
      `insert into public.referrals (business_id, referred_name, code, created_by)
       values ($1, 'First Friend', 'ABC123', $2)`,
      [businessId, owner],
    );

    await assert.rejects(
      () =>
        runAs(
          db,
          "authenticated",
          owner,
          `insert into public.referrals (business_id, referred_name, code, created_by)
           values ($1, 'Second Friend', 'ABC123', $2)`,
          [businessId, owner],
        ),
      /duplicate key value/i,
    );

    const other = await runAs(
      db,
      "authenticated",
      outsider,
      `insert into public.referrals (business_id, referred_name, code, created_by)
       values ($1, 'Their Friend', 'ABC123', $2) returning id`,
      [otherBusinessId, outsider],
    );
    assert.equal(other.rows.length, 1);
  });

  test("marketing posts respect tenant boundaries", async () => {
    const post = await runAs(
      db,
      "authenticated",
      owner,
      `insert into public.marketing_posts (business_id, title, caption, platform, created_by)
       values ($1, 'Autumn offer', 'Book this week', 'instagram', $2) returning id`,
      [businessId, owner],
    );
    assert.equal(post.rows.length, 1);

    const outsiderView = await runAs(db, "authenticated", outsider, `select id from public.marketing_posts`);
    assert.equal(outsiderView.rows.length, 0);

    await assert.rejects(
      () =>
        runAs(
          db,
          "authenticated",
          outsider,
          `insert into public.marketing_posts (business_id, title, caption, created_by)
           values ($1, 'Leak', 'Nope', $2)`,
          [businessId, outsider],
        ),
      /row-level security/i,
    );
  });

  test("only owners and admins can change the brand kit, but all members can read it", async () => {
    const asStaff = await runAs(
      db,
      "authenticated",
      staff,
      `update public.brand_kits set primary_color = '#000000' where business_id = $1 returning business_id`,
      [businessId],
    );
    assert.equal(asStaff.rows.length, 0);

    const asOwner = await runAs(
      db,
      "authenticated",
      owner,
      `update public.brand_kits set primary_color = '#112233' where business_id = $1 returning business_id`,
      [businessId],
    );
    assert.equal(asOwner.rows.length, 1);

    const read = await runAs(
      db,
      "authenticated",
      staff,
      `select primary_color from public.brand_kits where business_id = $1`,
      [businessId],
    );
    assert.equal(read.rows.length, 1);
  });

  test("only the owner can change billing, and only the test provider", async () => {
    const asStaff = await runAs(
      db,
      "authenticated",
      staff,
      `update public.subscriptions set plan = 'pro' where business_id = $1 returning business_id`,
      [businessId],
    );
    assert.equal(asStaff.rows.length, 0);

    const asOwner = await runAs(
      db,
      "authenticated",
      owner,
      `update public.subscriptions set plan = 'growth' where business_id = $1 returning business_id`,
      [businessId],
    );
    assert.equal(asOwner.rows.length, 1);

    await assert.rejects(
      () =>
        runAs(
          db,
          "authenticated",
          owner,
          `update public.subscriptions set provider = 'stripe' where business_id = $1`,
          [businessId],
        ),
      /row-level security/i,
    );
  });

  test("designs are private to the business and keep editable JSON", async () => {
    const created = await runAs(
      db,
      "authenticated",
      staff,
      `insert into public.designs (business_id, name, width, height, data, created_by)
       values ($1, 'Autumn poster', 1080, 1080, '{"layers":[]}'::jsonb, $2) returning id`,
      [businessId, staff],
    );
    assert.equal(created.rows.length, 1);

    const other = await runAs(db, "authenticated", outsider, `select id from public.designs`);
    assert.equal(other.rows.length, 0);
  });

  test("platform admins can read across tenants, but cannot write another tenant's data", async () => {
    const admin = await createUser(db, "admin@example.test", "Ada Admin");
    await db.query(`insert into public.platform_admins (user_id) values ($1)`, [admin]);

    const customer = await runAs(
      db,
      "authenticated",
      owner,
      `insert into public.customers (business_id, full_name, created_by) values ($1, 'Private Client', $2) returning id`,
      [businessId, owner],
    );
    const customerId = (customer.rows[0] as { id: string }).id;

    const businesses = await runAs(db, "authenticated", admin, `select id from public.businesses`);
    assert.equal(businesses.rows.length, 2, "an admin sees every business");

    const customers = await runAs(db, "authenticated", admin, `select id from public.customers`);
    assert.equal(customers.rows.length, 1);

    const attemptedWrite = await runAs(
      db,
      "authenticated",
      admin,
      `update public.customers set full_name = 'Changed by admin' where id = $1 returning id`,
      [customerId],
    );
    assert.equal(attemptedWrite.rows.length, 0, "admin read access must not become write access");
  });

  test("an ordinary member cannot see the platform admin table or other admins", async () => {
    const admin = await createUser(db, "admin2@example.test", "Ari Admin");
    await db.query(`insert into public.platform_admins (user_id) values ($1)`, [admin]);

    const asOwner = await runAs(db, "authenticated", owner, `select user_id from public.platform_admins`);
    assert.equal(asOwner.rows.length, 0);

    const asAdmin = await runAs(db, "authenticated", admin, `select user_id from public.platform_admins`);
    assert.equal(asAdmin.rows.length, 1, "an admin sees only their own admin row");
  });

  test("anonymous requests cannot read growth tables", async () => {
    for (const table of ["follow_ups", "reviews", "referrals", "marketing_posts", "designs", "subscriptions"]) {
      await assert.rejects(
        () => runAs(db, "anon", null, `select * from public.${table}`),
        /permission denied/i,
        `anon must not read ${table}`,
      );
    }
  });
});
