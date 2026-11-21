/**
 * Environment access.
 *
 * Nothing here is hardcoded and nothing is read at module scope, so `next build`
 * works without secrets present. Missing configuration fails loudly at request
 * time with an actionable message instead of a confusing network error.
 */

const MISSING_ENV_HELP =
  "Copy .env.example to .env.local and fill in the values from your Supabase project " +
  "(Project Settings -> API), or run `npx supabase start` and use its printed URL and anon key.";

export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    const missing = [
      !url ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      !anonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
    ].filter(Boolean);

    throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}. ${MISSING_ENV_HELP}`);
  }

  return { url, anonKey };
}

/** True when the app has enough configuration to talk to Supabase. */
export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}
