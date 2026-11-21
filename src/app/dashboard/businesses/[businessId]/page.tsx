import Link from "next/link";

import { loadBusiness } from "@/lib/businesses/context";
import { Badge, Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import { formatDate, formatDateTime, initials, monthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Customer = {
  id: string;
  full_name: string;
  status: "lead" | "active" | "vip" | "inactive";
  created_at: string;
  last_contacted_at: string | null;
};

type FollowUp = { id: string; title: string; status: string; due_at: string; customer_id: string | null };
type Review = { id: string; rating: number | null; status: string };
type Referral = { id: string; status: string };
type Post = { id: string; title: string; status: string; scheduled_for: string | null };

export default async function BusinessOverviewPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const { supabase, business } = await loadBusiness(businessId);

  const [customersResult, followUpsResult, reviewsResult, referralsResult, postsResult, designsResult] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, full_name, status, created_at, last_contacted_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("follow_ups").select("id, title, status, due_at, customer_id").eq("business_id", businessId).limit(500),
      supabase.from("reviews").select("id, rating, status").eq("business_id", businessId).limit(500),
      supabase.from("referrals").select("id, status").eq("business_id", businessId).limit(500),
      supabase.from("marketing_posts").select("id, title, status, scheduled_for").eq("business_id", businessId).limit(500),
      supabase.from("designs").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    ]);

  const customers = (customersResult.data ?? []) as Customer[];
  const followUps = (followUpsResult.data ?? []) as FollowUp[];
  const reviews = (reviewsResult.data ?? []) as Review[];
  const referrals = (referralsResult.data ?? []) as Referral[];
  const posts = (postsResult.data ?? []) as Post[];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = customers.filter((customer) => new Date(customer.created_at) >= startOfMonth).length;
  const activeCustomers = customers.filter((customer) => customer.status === "active" || customer.status === "vip").length;

  const pendingFollowUps = followUps.filter((followUp) => followUp.status !== "done");
  const overdue = pendingFollowUps.filter((followUp) => new Date(followUp.due_at) < now);
  const dueToday = pendingFollowUps.filter((followUp) => new Date(followUp.due_at).toDateString() === now.toDateString());
  const nextFollowUps = [...pendingFollowUps]
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
    .slice(0, 4);
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.full_name]));

  const rated = reviews.filter((review) => review.rating !== null);
  const averageRating = rated.length ? rated.reduce((sum, review) => sum + (review.rating ?? 0), 0) / rated.length : null;
  const convertedReferrals = referrals.filter((referral) => referral.status === "converted" || referral.status === "rewarded").length;
  const scheduledPosts = posts.filter((post) => post.status === "scheduled").length;

  const months: Array<{ label: string; key: string; count: number }> = [];
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    months.push({
      label: monthLabel(date),
      key: `${date.getFullYear()}-${date.getMonth()}`,
      count: 0,
    });
  }
  for (const customer of customers) {
    const date = new Date(customer.created_at);
    const bucket = months.find((month) => month.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.count += 1;
  }
  const maxCount = Math.max(1, ...months.map((month) => month.count));

  const statusCounts = {
    lead: customers.filter((customer) => customer.status === "lead").length,
    active: customers.filter((customer) => customer.status === "active").length,
    vip: customers.filter((customer) => customer.status === "vip").length,
    inactive: customers.filter((customer) => customer.status === "inactive").length,
  };
  const totalCustomers = customers.length || 1;

  const isEmpty = customers.length === 0 && followUps.length === 0 && posts.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={business.name}
        description={
          business.industry
            ? `${business.industry} · ${business.currency} · ${business.timezone}`
            : `${business.currency} · ${business.timezone}`
        }
        action={
          <Link href={`/dashboard/businesses/${businessId}/customers`} className="btn-primary">
            + Add customer
          </Link>
        }
      />

      {isEmpty && (
        <Card>
          <CardHeader title="Let's get your workspace working" description="Three steps and the daily queue starts filling itself." />
          <ol className="grid gap-3 px-5 py-4 sm:grid-cols-3">
            {[
              { href: `/dashboard/businesses/${businessId}/customers`, title: "Add your customers", body: "Names and phone numbers are enough to start." },
              { href: `/dashboard/businesses/${businessId}/settings`, title: "Complete your brand kit", body: "Colours, fonts and your review link power messages and posters." },
              { href: `/dashboard/businesses/${businessId}/follow-ups`, title: "Schedule a follow-up", body: "The queue tells you who to contact each day." },
            ].map((step, index) => (
              <li key={step.title}>
                <Link href={step.href} className="block h-full rounded-xl border border-slate-200 p-4 hover:border-brand-300 hover:bg-brand-50/30">
                  <p className="text-xs font-semibold text-brand-600">Step {index + 1}</p>
                  <p className="mt-1 font-medium text-slate-900">{step.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{step.body}</p>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Customers" value={customers.length} hint={`${newThisMonth} new this month`} href={`/dashboard/businesses/${businessId}/customers`} />
        <Stat label="Active" value={activeCustomers} hint={customers.length ? `${Math.round((activeCustomers / totalCustomers) * 100)}% of your list` : "—"} href={`/dashboard/businesses/${businessId}/customers?status=active`} />
        <Stat label="Follow-ups due" value={pendingFollowUps.length} hint={`${overdue.length} overdue · ${dueToday.length} today`} href={`/dashboard/businesses/${businessId}/follow-ups`} />
        <Stat label="Avg. rating" value={averageRating ? averageRating.toFixed(1) : "—"} hint={`${rated.length} rated reviews`} href={`/dashboard/businesses/${businessId}/reviews`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Customer growth" description="New customers added over the last six months" />
          <div className="px-5 py-5">
            <div className="flex h-44 items-end gap-3">
              {months.map((month) => (
                <div key={month.key} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">{month.count}</span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-violet-400"
                    style={{ height: `${Math.max(4, (month.count / maxCount) * 130)}px` }}
                    title={`${month.count} new customers`}
                  />
                  <span className="text-xs text-slate-500">{month.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Pipeline" description="Where your customers are right now" />
          <div className="space-y-3 px-5 py-5">
            {(["lead", "active", "vip", "inactive"] as const).map((status) => {
              const count = statusCounts[status];
              const percent = Math.round((count / totalCustomers) * 100);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 capitalize">{status}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={
                        status === "active"
                          ? "h-full rounded-full bg-emerald-500"
                          : status === "vip"
                            ? "h-full rounded-full bg-violet-500"
                            : status === "inactive"
                              ? "h-full rounded-full bg-amber-400"
                              : "h-full rounded-full bg-slate-400"
                      }
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
              <div>
                <p className="text-lg font-semibold">{convertedReferrals}</p>
                <p className="text-xs text-slate-500">Referrals converted</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{scheduledPosts}</p>
                <p className="text-xs text-slate-500">Posts scheduled</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{designsResult.count ?? 0}</p>
                <p className="text-xs text-slate-500">Designs saved</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Up next"
            description="Your follow-up queue"
            action={<Link href={`/dashboard/businesses/${businessId}/follow-ups`} className="text-xs font-medium text-brand-600 hover:underline">Open queue</Link>}
          />
          {nextFollowUps.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              Nothing scheduled. A follow-up a day is the simplest growth habit there is.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {nextFollowUps.map((followUp) => (
                <li key={followUp.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{followUp.title}</p>
                    <p className="text-xs text-slate-500">
                      {followUp.customer_id ? customerNames.get(followUp.customer_id) ?? "Customer" : "General task"}
                    </p>
                  </div>
                  <Badge tone={new Date(followUp.due_at) < now ? "red" : "brand"}>{formatDateTime(followUp.due_at)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent customers"
            description="Newest first"
            action={<Link href={`/dashboard/businesses/${businessId}/customers`} className="text-xs font-medium text-brand-600 hover:underline">View all</Link>}
          />
          {customers.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">No customers yet. Add your first one to start the CRM.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {customers.slice(0, 5).map((customer) => (
                <li key={customer.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                      {initials(customer.full_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{customer.full_name}</p>
                      <p className="text-xs text-slate-500">Added {formatDate(customer.created_at)}</p>
                    </div>
                  </div>
                  <Badge tone={customer.status === "active" ? "green" : customer.status === "vip" ? "violet" : customer.status === "inactive" ? "amber" : "slate"}>
                    {customer.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
