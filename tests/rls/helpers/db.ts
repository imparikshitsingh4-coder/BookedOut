import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Test harness for the Row Level Security policies.
 *
 * The policies only use standard PostgreSQL features plus Supabase's `auth.uid()`
 * helper, so they can be executed for real in an in-process Postgres (PGlite).
 * This shim recreates exactly the parts of Supabase the migrations rely on:
 * the `auth.users` table, `auth.uid()`, and the `anon` / `authenticated` /
 * `service_role` database roles. It is test-only and never shipped to the app.
 */
const AUTH_SCHEMA_SHIM = `
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  );
$$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end;
$$;

-- Supabase grants these to the API roles so that RLS policies can call
-- auth.uid(); without them, policy evaluation fails with "permission denied
-- for schema auth". Mirror that here so the tests exercise the real setup.
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;
`;

export type TestRole = "anon" | "authenticated" | "service_role";

export type TestDb = PGlite;

/** Creates a fresh database, the Supabase auth shim, and every migration in order. */
export async function createTestDb(): Promise<TestDb> {
  const db = new PGlite();
  await db.exec(AUTH_SCHEMA_SHIM);

  const migrationsDir = path.resolve("supabase/migrations");
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

  if (files.length === 0) {
    throw new Error(`No migrations found in ${migrationsDir}`);
  }

  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }

  return db;
}

/**
 * Runs one statement as the given database role with a matching JWT claim, which
 * is how Supabase's PostgREST invokes a request. `userId` null means "signed out".
 */
export async function runAs(
  db: TestDb,
  role: TestRole,
  userId: string | null,
  sql: string,
  params: unknown[] = [],
) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role};`);
    const claims = userId ? JSON.stringify({ sub: userId, role }) : "";
    await tx.exec(`set local request.jwt.claims = '${claims}';`);
    return tx.query(sql, params);
  });
}

/** Creates a user the way Supabase Auth would, returning the new id. */
export async function createUser(db: TestDb, email: string, fullName: string): Promise<string> {
  const result = await db.query<{ id: string }>(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`,
    [email, JSON.stringify({ full_name: fullName })],
  );
  return result.rows[0].id;
}

/** Creates a business through RLS, as the owner-to-be. Returns its id. */
export async function createBusinessAs(db: TestDb, userId: string, name: string): Promise<string> {
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
  const result = await runAs(
    db,
    "authenticated",
    userId,
    `insert into public.businesses (name, slug, created_by) values ($1, $2, $3) returning id`,
    [name, slug, userId],
  );
  return (result.rows[0] as { id: string }).id;
}
