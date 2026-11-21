import { loadBusiness } from "@/lib/businesses/context";
import {
  completeFollowUpAction,
  createFollowUpAction,
  deleteFollowUpAction,
  snoozeFollowUpAction,
} from "@/lib/followups/actions";
import { ErrorNotice, Notice } from "@/components/form";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { buildMessage, waChatLink } from "@/lib/whatsapp";
import { daysFromNow, formatDateTime, toLocalInputValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

type FollowUp = {
  id: string;
  title: string;
  notes: string | null;
  channel: "whatsapp" | "call" | "email" | "in_person";
  status: "pending" | "done" | "snoozed";
  due_at: string;
  completed_at: string | null;
  customer_id: string | null;
  customers: { full_name: string; phone: string | null; whatsapp_opt_in: boolean } | null;
};

type CustomerOption = { id: string; full_name: string; phone: string | null };

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "call", label: "Phone call" },
  { value: "email", label: "Email" },
  { value: "in_person", label: "In person" },
];

export default async function FollowUpsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { businessId } = await params;
  const { message, error } = await searchParams;
  const { supabase, business } = await loadBusiness(businessId);

  const [{ data: followUps }, { data: customers }] = await Promise.all([
    supabase
      .from("follow_ups")
      .select("id, title, notes, channel, status, due_at, completed_at, customer_id, customers(full_name, phone, whatsapp_opt_in)")
      .eq("business_id", businessId)
      .order("due_at", { ascending: true })
      .limit(200),
    supabase.from("customers").select("id, full_name, phone").eq("business_id", businessId).order("full_name").limit(500),
  ]);

  const rows = (followUps ?? []) as unknown as FollowUp[];
  const pending = rows.filter((row) => row.status !== "done");
  const done = rows.filter((row) => row.status === "done").slice(-8).reverse();
  const customerOptions = (customers ?? []) as CustomerOption[];
  const now = new Date().getTime();

  const overdue = pending.filter((row) => new Date(row.due_at).getTime() < now).length;
  const dueToday = pending.filter((row) => {
    const due = new Date(row.due_at);
    const today = new Date();
    return due.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        description="A single queue of who to contact and when. Open WhatsApp with the message already written."
        action={
          <div className="flex gap-2 text-sm">
            <span className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700">
              <strong>{overdue}</strong> overdue
            </span>
            <span className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <strong>{dueToday}</strong> today
            </span>
          </div>
        }
      />

      {message && <Notice>{message}</Notice>}
      {error && <ErrorNotice>{error}</ErrorNotice>}

      <Card>
        <CardHeader title="Schedule a follow-up" description="Reminders are private to your business." />
        <form action={createFollowUpAction} className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <input type="hidden" name="business_id" value={businessId} />
          <div>
            <label className="label">What is it about?</label>
            <input name="title" required className="field" placeholder="Check in after first visit" />
          </div>
          <div>
            <label className="label">Customer</label>
            <select name="customer_id" className="field">
              <option value="">No specific customer</option>
              {customerOptions.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Due</label>
            <input
              type="datetime-local"
              name="due_at"
              defaultValue={toLocalInputValue(daysFromNow(1))}
              className="field"
            />
          </div>
          <div>
            <label className="label">Channel</label>
            <select name="channel" className="field">
              {CHANNELS.map((channel) => (
                <option key={channel.value} value={channel.value}>{channel.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes (optional)</label>
            <textarea name="notes" rows={2} className="field" placeholder="Anything to remember before you reach out" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Add to queue</button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title={`Up next (${pending.length})`} description="Overdue first" />
        {pending.length === 0 ? (
          <EmptyState title="The queue is clear" description="Nothing to chase today. Add a follow-up above or check back tomorrow." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {pending
              .slice()
              .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
              .map((followUp) => {
                const due = new Date(followUp.due_at);
                const isOverdue = due.getTime() < now;
                const customerName = followUp.customers?.full_name ?? null;
                const messageText = buildMessage("follow_up", {
                  businessName: business.name,
                  customerName,
                  signature: business.name,
                });
                const canWhatsApp = Boolean(followUp.customers?.phone && followUp.customers.whatsapp_opt_in);

                return (
                  <li key={followUp.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">{followUp.title}</p>
                        <Badge tone={isOverdue ? "red" : "brand"}>{isOverdue ? "Overdue" : "Scheduled"}</Badge>
                        <Badge tone="slate">{followUp.channel.replace("_", " ")}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {customerName ?? "General task"} · due {formatDateTime(followUp.due_at)}
                      </p>
                      {followUp.notes && <p className="mt-1 text-xs text-slate-500">{followUp.notes}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {canWhatsApp && (
                        <a
                          href={waChatLink(followUp.customers?.phone, messageText)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost !text-emerald-700"
                        >
                          WhatsApp
                        </a>
                      )}
                      <form action={snoozeFollowUpAction}>
                        <input type="hidden" name="business_id" value={businessId} />
                        <input type="hidden" name="follow_up_id" value={followUp.id} />
                        <button type="submit" className="btn-ghost">+1 day</button>
                      </form>
                      <form action={completeFollowUpAction}>
                        <input type="hidden" name="business_id" value={businessId} />
                        <input type="hidden" name="follow_up_id" value={followUp.id} />
                        <input type="hidden" name="customer_id" value={followUp.customer_id ?? ""} />
                        <button type="submit" className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                          Done
                        </button>
                      </form>
                      <form action={deleteFollowUpAction}>
                        <input type="hidden" name="business_id" value={businessId} />
                        <input type="hidden" name="follow_up_id" value={followUp.id} />
                        <button type="submit" className="btn-danger">×</button>
                      </form>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </Card>

      {done.length > 0 && (
        <Card>
          <CardHeader title="Recently completed" description="Last eight" />
          <ul className="divide-y divide-slate-100">
            {done.map((followUp) => (
              <li key={followUp.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="text-slate-500 line-through">{followUp.title}</span>
                <span className="text-xs text-slate-400">{formatDateTime(followUp.completed_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
