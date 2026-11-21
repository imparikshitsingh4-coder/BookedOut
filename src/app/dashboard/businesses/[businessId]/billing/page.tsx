import { loadBusiness } from "@/lib/businesses/context";
import { choosePlanAction, cancelSubscriptionAction, resumeSubscriptionAction } from "@/lib/billing/actions";
import { PLANS, SUBSCRIPTION_STATUS_LABEL, getPlan } from "@/lib/billing/plans";
import { isTestBilling } from "@/lib/billing/provider";
import { ErrorNotice, Notice } from "@/components/form";
import { Badge, Card, CardHeader, PageHeader, TestModeNotice } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Subscription = {
  plan: string;
  status: "trialing" | "active" | "past_due" | "canceled";
  provider: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
};

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { businessId } = await params;
  const { message, error } = await searchParams;
  const { supabase, business, role } = await loadBusiness(businessId);

  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, provider, trial_ends_at, current_period_end, canceled_at")
    .eq("business_id", businessId)
    .maybeSingle();

  const subscription = (data ?? null) as Subscription | null;
  const currentPlan = getPlan(subscription?.plan ?? "starter");
  const isOwner = role === "owner";

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Your plan, trial and cancellation. No card is required in this build." />

      {message && <Notice>{message}</Notice>}
      {error && <ErrorNotice>{error}</ErrorNotice>}
      {isTestBilling() && (
        <TestModeNotice>
          Payments are not live. Choosing a plan records it locally as a test trial — no checkout, no card, no invoice,
          and nothing is charged. The payment architecture is ready for a real provider later.
        </TestModeNotice>
      )}

      <Card>
        <CardHeader title="Current plan" description="Applies to this business only." />
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xl font-semibold text-slate-900">{currentPlan.name}</p>
              {subscription && (
                <Badge tone={subscription.status === "canceled" ? "red" : subscription.status === "active" ? "green" : "amber"}>
                  {SUBSCRIPTION_STATUS_LABEL[subscription.status] ?? subscription.status}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">{currentPlan.tagline}</p>
            <ul className="mt-4 space-y-1 text-sm text-slate-600">
              {subscription?.trial_ends_at && subscription.status !== "canceled" && (
                <li>Test trial ends {formatDate(subscription.trial_ends_at)}</li>
              )}
              {subscription?.canceled_at && <li>Canceled {formatDate(subscription.canceled_at)}</li>}
              <li>Provider: {subscription?.provider ?? "test"}</li>
              <li>Seat and plan enforcement is part of the plan catalogue; data is never deleted on cancel.</li>
            </ul>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {subscription?.status === "canceled" ? (
              <form action={resumeSubscriptionAction}>
                <input type="hidden" name="business_id" value={businessId} />
                <button type="submit" className="btn-primary" disabled={!isOwner}>Resume in test mode</button>
              </form>
            ) : (
              <form action={cancelSubscriptionAction}>
                <input type="hidden" name="business_id" value={businessId} />
                <button type="submit" className="btn-secondary" disabled={!isOwner}>Cancel subscription</button>
              </form>
            )}
            {!isOwner && <p className="text-xs text-slate-500">Only the owner can change billing.</p>}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === (subscription?.plan ?? "starter");
          return (
            <Card key={plan.id} className={plan.highlighted ? "ring-2 ring-brand-500" : undefined}>
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold text-slate-900">{plan.name}</p>
                  {isCurrent && <Badge tone="brand">Current</Badge>}
                </div>
                <p className="text-3xl font-bold tracking-tight">
                  {plan.price === 0 ? "Free" : `$${plan.price}`}
                  <span className="ml-1 text-sm font-normal text-slate-500">{plan.price === 0 ? "" : "/mo"}</span>
                </p>
                <p className="text-sm text-slate-600">{plan.tagline}</p>
                <ul className="space-y-1.5 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="text-brand-600">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <form action={choosePlanAction}>
                  <input type="hidden" name="business_id" value={businessId} />
                  <input type="hidden" name="plan" value={plan.id} />
                  <button
                    type="submit"
                    className={plan.highlighted ? "btn-primary w-full" : "btn-secondary w-full"}
                    disabled={!isOwner}
                  >
                    {isCurrent ? "Restart test trial" : `Set ${plan.name} in test mode`}
                  </button>
                </form>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader title="How real payments will plug in" description="Architecture, not a mock checkout." />
        <div className="space-y-2 px-5 py-4 text-sm text-slate-600">
          <p>
            The app talks to a <code className="rounded bg-slate-100 px-1">PaymentProvider</code> interface
            (<code className="rounded bg-slate-100 px-1">src/lib/billing/provider.ts</code>). This build selects the test
            provider with <code className="rounded bg-slate-100 px-1">PAYMENTS_PROVIDER=test</code>.
          </p>
          <p>
            To go live, add a server-only provider that creates a real checkout session and verifies signed webhooks,
            then write the subscription status from that verified event using the service role. A failed or unpaid
            payment will never be recorded as active by this app.
          </p>
          <p>Business /{business.slug} · owner-only changes · no secrets are exposed to the browser.</p>
        </div>
      </Card>
    </div>
  );
}
