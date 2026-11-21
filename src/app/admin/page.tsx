import Link from "next/link";

import { hasSupabaseEnv } from "@/lib/env";
import { requireSession } from "@/lib/businesses/context";
import { Badge, Card, CardHeader, PageHeader, SetupNotice } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { SUBSCRIPTION_STATUS_LABEL, getPlan } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!hasSupabaseEnv()) return <SetupNotice />;

  const { supabase, user } = await requireSession();

  // RLS only exposes your own platform_admins row, so this is also the check.
  const { data: adminRow } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <h1 className="text-2xl font-semibold tracking-tight">Platform admin</h1>
        <p className="mt-3 text-sm text-slate-600">
          This area is limited to BookedOut platform admins. Your account does not have access.
        </p>
        <Link href="/dashboard" className="btn-secondary mt-6">Back to dashboard</Link>
      </main>
    );
  }

  const [businessesResult, profilesResult, customersResult, subscriptionsResult] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, slug, industry, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("subscriptions").select("business_id, plan, status, provider, created_at").limit(500),
  ]);

  const businesses = businessesResult.data ?? [];
  const subscriptions = subscriptionsResult.data ?? [];
  const planCounts = subscriptions.reduce<Record<string, number>>((counts, subscription) => {
    counts[subscription.plan as string] = (counts[subscription.plan as string] ?? 0) + 1;
    return counts;
  }, {});
  const statusCounts = subscriptions.reduce<Record<string, number>>((counts, subscription) => {
    counts[subscription.status as string] = (counts[subscription.status as string] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Platform admin" description="Read-only cross-tenant view for operating BookedOut." />
        <div className="flex items-center gap-2">
          <Badge tone="violet">Admin</Badge>
          <Link href="/dashboard" className="btn-secondary">Back to dashboard</Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Users", value: profilesResult.count ?? 0 },
          { label: "Businesses", value: businesses.length },
          { label: "Customers", value: customersResult.count ?? 0 },
          { label: "Subscriptions", value: subscriptions.length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Newest businesses" description="Most recent 20" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-2 font-medium">Business</th>
                  <th className="px-5 py-2 font-medium">Industry</th>
                  <th className="px-5 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {businesses.slice(0, 20).map((business) => (
                  <tr key={business.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{business.name}</p>
                      <p className="text-xs text-slate-500">/{business.slug}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{business.industry ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-600">{formatDate(business.created_at)}</td>
                  </tr>
                ))}
                {businesses.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-center text-slate-500">No businesses yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Plans" description="Distribution across subscriptions" />
            <ul className="divide-y divide-slate-100">
              {Object.keys(planCounts).length === 0 && (
                <li className="px-5 py-4 text-sm text-slate-500">No subscriptions yet.</li>
              )}
              {Object.entries(planCounts).map(([plan, count]) => (
                <li key={plan} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="font-medium text-slate-700">{getPlan(plan).name}</span>
                  <span className="text-slate-500">{count}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Billing status" description="Test mode is expected until a provider is live" />
            <ul className="divide-y divide-slate-100">
              {Object.entries(statusCounts).map(([status, count]) => (
                <li key={status} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="font-medium text-slate-700">{SUBSCRIPTION_STATUS_LABEL[status] ?? status}</span>
                  <span className="text-slate-500">{count}</span>
                </li>
              ))}
              {Object.keys(statusCounts).length === 0 && (
                <li className="px-5 py-4 text-sm text-slate-500">No subscriptions yet.</li>
              )}
            </ul>
          </Card>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Admins have read-only access to tenant data. Writes still go through the same business-membership policies.
      </p>
    </main>
  );
}
