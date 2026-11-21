import Link from "next/link";
import { redirect } from "next/navigation";

import { createBusinessAction } from "@/lib/businesses/actions";
import { signOutAction } from "@/lib/auth/actions";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ErrorNotice, Field, Notice } from "@/components/form";
import { SetupNotice } from "@/components/ui";

export const dynamic = "force-dynamic";

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  created_at: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  if (!hasSupabaseEnv()) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: businesses, error: businessesError }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("businesses").select("id, name, slug, industry, created_at").order("created_at", { ascending: true }),
  ]);

  const { data: adminRow } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const rows = (businesses ?? []) as BusinessRow[];
  const fullName = profile?.full_name as string | null | undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-sm font-black text-white">
              B
            </span>
            <span className="text-lg font-bold tracking-tight">BookedOut</span>
          </Link>
          <div className="flex items-center gap-2">
            {adminRow && (
              <Link href="/admin" className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                Admin
              </Link>
            )}
            <Link href="/dashboard/account" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400">
              Account
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:px-6">
        <header className="space-y-1">
          <p className="text-sm text-slate-500">Signed in as {user.email}</p>
          <h1 className="text-3xl font-bold tracking-tight">{fullName ? `Hi, ${fullName}` : "Your workspace"}</h1>
          <p className="text-sm text-slate-600">Choose a business to open, or create your first one.</p>
        </header>

        {message === "business-created" && <Notice>Business created. You are its owner.</Notice>}
        {error && <ErrorNotice>{error}</ErrorNotice>}
        {businessesError && <ErrorNotice>{businessesError.message}</ErrorNotice>}

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Your businesses</h2>
            <span className="text-sm text-slate-500">{rows.length}</span>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
              No businesses yet. Create one below — you become the owner and your brand kit is set up automatically.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {rows.map((business) => (
                <li key={business.id}>
                  <Link
                    href={`/dashboard/businesses/${business.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{business.name}</p>
                      <p className="text-xs text-slate-500">
                        {business.industry ?? "Business"} · /{business.slug}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-brand-600">Open →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Add a business</h2>
            <p className="text-sm text-slate-500">You can run more than one business from the same login.</p>
          </div>
          <form action={createBusinessAction} className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <Field label="Business name" name="name" required />
            </div>
            <div className="min-w-44">
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="industry">
                Industry
              </label>
              <input
                id="industry"
                name="industry"
                className="field"
                placeholder="Salon, gym, clinic…"
              />
            </div>
            <button type="submit" className="btn-primary">
              Create business
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
