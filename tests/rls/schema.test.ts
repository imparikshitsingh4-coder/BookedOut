import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { createTestDb, type TestDb } from "./helpers/db.ts";

describe("schema hardening", () => {
  let db: TestDb;

  before(async () => {
    db = await createTestDb();
  });

  after(async () => {
    await db.close();
  });

  test("row level security is enabled on every tenant table", async () => {
    const result = await db.query<{ relname: string; relrowsecurity: boolean }>(`
      select c.relname, c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ('profiles', 'businesses', 'business_members', 'customers')
      order by c.relname
    `);

    assert.deepEqual(
      result.rows.map((row) => row.relname),
      ["business_members", "businesses", "customers", "profiles"],
    );
    for (const row of result.rows) {
      assert.equal(row.relrowsecurity, true, `RLS is not enabled on public.${row.relname}`);
    }
  });

  test("every tenant table has at least one policy", async () => {
    const result = await db.query<{ tablename: string; count: string }>(`
      select tablename, count(*)::text as count
      from pg_policies
      where schemaname = 'public'
      group by tablename
    `);
    const counts = Object.fromEntries(result.rows.map((row) => [row.tablename, Number(row.count)]));

    for (const table of ["profiles", "businesses", "business_members", "customers"]) {
      assert.ok((counts[table] ?? 0) > 0, `public.${table} has no RLS policies`);
    }
  });

  test("anonymous visitors have no privileges on tenant tables", async () => {
    const result = await db.query<{ table_name: string; privilege_type: string }>(`
      select table_name, privilege_type
      from information_schema.role_table_grants
      where grantee = 'anon' and table_schema = 'public'
    `);

    assert.deepEqual(result.rows, [], "anon should not be granted any table privileges");
  });

  test("membership helpers are not executable by anonymous requests", async () => {
    const result = await db.query<{ has_execute: boolean }>(`
      select has_function_privilege('anon', 'public.is_business_member(uuid)', 'EXECUTE') as has_execute
    `);
    assert.equal(result.rows[0].has_execute, false);
  });

  test("the service role bypasses RLS for trusted server tooling", async () => {
    const result = await db.query<{ service_role: boolean; authenticated: boolean }>(`
      select
        (select rolbypassrls from pg_roles where rolname = 'service_role') as service_role,
        (select rolbypassrls from pg_roles where rolname = 'authenticated') as authenticated
    `);
    assert.equal(result.rows[0].service_role, true);
    assert.equal(result.rows[0].authenticated, false);
  });
});
