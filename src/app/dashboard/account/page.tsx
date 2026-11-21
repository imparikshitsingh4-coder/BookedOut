import Link from "next/link";

import { changePasswordAction, updateProfileAction } from "@/lib/settings/actions";
import { signOutAction } from "@/lib/auth/actions";
import { hasSupabaseEnv } from "@/lib/env";
import { requireSession } from "@/lib/businesses/context";
import { ErrorNotice, Notice } from "@/components/form";
import { Card, CardHeader, PageHeader, SetupNotice } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  if (!hasSupabaseEnv()) return <SetupNotice />;

  const { message, error } = await searchParams;
  const { supabase, user } = await requireSession();

  const [{ data: profile }, { data: businesses }, { data: adminRow }] = await Promise.all([
    supabase.from("profiles").select("full_name, created_at").eq("id", user.id).maybeSingle(),
    supabase.from("businesses").select("id, name, slug").order("created_at"),
    supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">← Dashboard</Link>
          <div className="flex items-center gap-2">
            {adminRow && (
              <Link href="/admin" className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                Admin
              </Link>
            )}
            <form action={signOutAction}>
              <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <PageHeader title="Account settings" description="Your login, profile and businesses." />

        {message && <Notice>{message}</Notice>}
        {error && <ErrorNotice>{error}</ErrorNotice>}

        <Card>
          <CardHeader title="Profile" description="Shown to teammates in businesses you share." />
          <form action={updateProfileAction} className="space-y-4 px-5 py-4">
            <div>
              <label className="label">Full name</label>
              <input name="full_name" defaultValue={profile?.full_name ?? ""} required className="field" />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                value={user.email ?? ""}
                readOnly
                disabled
                className="field bg-slate-50 text-slate-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Your email is managed by Supabase Auth with verification enabled.
              </p>
            </div>
            <button type="submit" className="btn-primary">Save profile</button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Password" description="Changing it requires your current password." />
          <form action={changePasswordAction} className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Current password</label>
              <input name="current_password" type="password" autoComplete="current-password" required className="field" />
            </div>
            <div>
              <label className="label">New password</label>
              <input name="password" type="password" autoComplete="new-password" required minLength={8} className="field" />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input name="confirm_password" type="password" autoComplete="new-password" required minLength={8} className="field" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary">Change password</button>
            </div>
          </form>
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Forgot it instead? <Link href="/forgot-password" className="font-medium text-brand-600 hover:underline">Send a reset link</Link>.
          </p>
        </Card>

        <Card>
          <CardHeader title="Your businesses" description="Each has its own customers, brand kit and subscription." />
          <ul className="divide-y divide-slate-100">
            {(businesses ?? []).length === 0 ? (
              <li className="px-5 py-4 text-sm text-slate-600">No businesses yet.</li>
            ) : (
              (businesses ?? []).map((business) => (
                <li key={business.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{business.name}</p>
                    <p className="text-xs text-slate-500">/{business.slug}</p>
                  </div>
                  <Link href={`/dashboard/businesses/${business.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                    Open →
                  </Link>
                </li>
              ))
            )}
          </ul>
        </Card>

        <p className="text-xs text-slate-400">
          Member since {formatDate(profile?.created_at)} · user id {user.id.slice(0, 8)}…
        </p>
      </main>
    </div>
  );
}
