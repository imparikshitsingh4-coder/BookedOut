"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/lib/env";

/**
 * Supabase client for Client Components.
 *
 * Cookies are handled by @supabase/ssr so the browser and the server share one
 * session. Create it inside a component (or a hook), not at module scope, so the
 * same module can render on the server during build.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
