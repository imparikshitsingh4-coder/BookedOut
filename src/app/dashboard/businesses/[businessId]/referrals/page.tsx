import { loadBusiness } from "@/lib/businesses/context";
import {
  createReferralAction,
  deleteReferralAction,
  updateReferralStatusAction,
} from "@/lib/referrals/actions";
import { setCustomerStatusAction } from "@/lib/crm/actions";
import { ErrorNotice, Notice } from "@/components/form";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { buildMessage, waChatLink } from "@/lib/whatsapp";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Referral = {
  id: string;
  referrer_customer_id: string | null;
  referred_name: string;
  referred_phone: string | null;
  referred_email: string | null;
  code: string;
  status: "invited" | "signed_up" | "converted" | "rewarded";
  reward_note: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
  last_contacted_at: string | null;
  whatsapp_opt_in: boolean;
};

const STATUS_TONE = {
  invited: "amber",
  signed_up: "brand",
  converted: "green",
  rewarded: "violet",
} as const;

export default async function ReferralsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { businessId } = await params;
  const { message, error } = await searchParams;
  const { supabase, business } = await loadBusiness(businessId);

  const [{ data: referralRows }, { data: customerRows }] = await Promise.all([
    supabase
      .from("referrals")
      .select("id, referrer_customer_id, referred_name, referred_phone, referred_email, code, status, reward_note, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("customers")
      .select("id, full_name, phone, status, last_contacted_at, whatsapp_opt_in")
      .eq("business_id", businessId)
      .order("full_name")
      .limit(500),
  ]);

  const referrals = (referralRows ?? []) as Referral[];
  const customers = (customerRows ?? []) as Customer[];
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const quietCustomers = customers.filter((customer) => customer.status === "inactive");

  const converted = referrals.filter((referral) => referral.status === "converted" || referral.status === "rewarded").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referrals & win-backs"
        description="Turn happy customers into your best sales channel, and bring quiet ones back."
      />

      {message && <Notice>{message}</Notice>}
      {error && <ErrorNotice>{error}</ErrorNotice>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Referrals tracked</p>
          <p className="mt-2 text-2xl font-semibold">{referrals.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Converted</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{converted}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Quiet customers</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{quietCustomers.length}</p>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Track a referral"
          description="Leave the code empty and we generate a unique one."
          action={
            <details>
              <summary className="btn-primary list-none !py-2">+ New referral</summary>
              <div className="absolute right-0 top-full z-30 mt-2 w-[min(92vw,30rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <form action={createReferralAction} className="space-y-3">
                  <input type="hidden" name="business_id" value={businessId} />
                  <input type="hidden" name="business_name" value={business.name} />
                  <div>
                    <label className="label">Who referred them?</label>
                    <select name="referrer_customer_id" className="field">
                      <option value="">No existing customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Referred person</label>
                    <input name="referred_name" required className="field" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Phone</label>
                      <input name="referred_phone" className="field" placeholder="+44…" />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input name="referred_email" type="email" className="field" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Code (optional)</label>
                      <input name="code" className="field" placeholder="Auto-generated" />
                    </div>
                    <div>
                      <label className="label">Reward note</label>
                      <input name="reward_note" className="field" placeholder="20% off next visit" />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary w-full">Save referral</button>
                </form>
              </div>
            </details>
          }
        />
        <div className="px-5 py-4">
          {referrals.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
              No referrals yet. Ask your happiest customer for a name — the best customers usually know more of them.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {referrals.map((referral) => {
                const referrer = referral.referrer_customer_id ? customerById.get(referral.referrer_customer_id) : null;
                const shareMessage = buildMessage("referral_invite", {
                  businessName: business.name,
                  customerName: referrer?.full_name,
                  referralCode: referral.code,
                });

                return (
                  <li key={referral.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">{referral.referred_name}</p>
                        <Badge tone={STATUS_TONE[referral.status]}>{referral.status.replace("_", " ")}</Badge>
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                          {referral.code}
                        </code>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Referred by {referrer?.full_name ?? "—"} · added {formatDate(referral.created_at)}
                      </p>
                      {(referral.referred_phone || referral.referred_email) && (
                        <p className="text-xs text-slate-500">
                          {[referral.referred_phone, referral.referred_email].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {referral.reward_note && <p className="mt-1 text-xs text-emerald-700">Reward: {referral.reward_note}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {referrer?.phone && referrer.whatsapp_opt_in && (
                        <a href={waChatLink(referrer.phone, shareMessage)} target="_blank" rel="noreferrer" className="btn-ghost !text-emerald-700">
                          Share code
                        </a>
                      )}
                      <form action={updateReferralStatusAction} className="flex items-center gap-1">
                        <input type="hidden" name="business_id" value={businessId} />
                        <input type="hidden" name="referral_id" value={referral.id} />
                        <select name="status" defaultValue={referral.status} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
                          <option value="invited">Invited</option>
                          <option value="signed_up">Signed up</option>
                          <option value="converted">Converted</option>
                          <option value="rewarded">Rewarded</option>
                        </select>
                        <button type="submit" className="btn-ghost">Save</button>
                      </form>
                      <form action={deleteReferralAction}>
                        <input type="hidden" name="business_id" value={businessId} />
                        <input type="hidden" name="referral_id" value={referral.id} />
                        <button type="submit" className="btn-danger">×</button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={`Win-back list (${quietCustomers.length})`}
          description="Customers marked inactive. Send a warm message or reactivate them once they reply."
        />
        {quietCustomers.length === 0 ? (
          <EmptyState
            title="Nobody has gone quiet"
            description="Customers you mark inactive will appear here with a ready-to-send reactivation message."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {quietCustomers.map((customer) => {
              const reactivation = buildMessage("reactivation", {
                businessName: business.name,
                customerName: customer.full_name,
                offer: "We saved you a welcome-back offer.",
              });
              return (
                <li key={customer.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{customer.full_name}</p>
                    <p className="text-xs text-slate-500">
                      {customer.phone ?? "No phone"} · last contact {formatDate(customer.last_contacted_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={waChatLink(customer.phone, reactivation)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost !text-emerald-700"
                    >
                      WhatsApp
                    </a>
                    <form action={setCustomerStatusAction}>
                      <input type="hidden" name="business_id" value={businessId} />
                      <input type="hidden" name="customer_id" value={customer.id} />
                      <input type="hidden" name="status" value="active" />
                      <button type="submit" className="btn-ghost !text-brand-700">Mark active</button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
