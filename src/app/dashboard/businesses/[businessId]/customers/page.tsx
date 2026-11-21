import { notFound } from "next/navigation";

import { loadBusiness } from "@/lib/businesses/context";
import {
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction,
} from "@/lib/crm/actions";
import { ErrorNotice, Notice } from "@/components/form";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Customer = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: "lead" | "active" | "vip" | "inactive";
  tags: string[] | null;
  notes: string | null;
  last_contacted_at: string | null;
  whatsapp_opt_in: boolean;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "active", label: "Active" },
  { value: "vip", label: "VIP" },
  { value: "inactive", label: "Inactive" },
];

const TONE: Record<string, "slate" | "green" | "violet" | "amber"> = {
  lead: "slate",
  active: "green",
  vip: "violet",
  inactive: "amber",
};

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ q?: string; status?: string; message?: string; error?: string }>;
}) {
  const { businessId } = await params;
  const { q, status, message, error } = await searchParams;
  const { supabase, business } = await loadBusiness(businessId);
  if (!business) notFound();

  const search = (q ?? "").replace(/[,()%]/g, "").trim();
  const statusFilter = STATUS_OPTIONS.some((option) => option.value === status) ? status : undefined;

  let query = supabase
    .from("customers")
    .select("id, full_name, email, phone, status, tags, notes, last_contacted_at, whatsapp_opt_in, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: customers, error: queryError } = await query;
  const rows = (customers ?? []) as Customer[];

  const [{ count: total }, { count: active }, { count: leads }] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "active"),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "lead"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Your CRM. Add customers, keep notes and tags current, and move people through your pipeline."
        action={
          <div className="flex gap-2 text-sm">
            <span className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <strong className="text-slate-900">{total ?? 0}</strong> total
            </span>
            <span className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <strong className="text-emerald-700">{active ?? 0}</strong> active
            </span>
            <span className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 sm:block">
              <strong className="text-slate-900">{leads ?? 0}</strong> leads
            </span>
          </div>
        }
      />

      {message && <Notice>{message}</Notice>}
      {(error || queryError) && <ErrorNotice>{error ?? queryError?.message}</ErrorNotice>}

      <Card>
        <CardHeader
          title="Add a customer"
          description="Only the name is required. Email is unique per business."
          action={
            <details className="group">
              <summary className="btn-primary list-none !py-2">+ New customer</summary>
              <div className="absolute right-0 top-full z-30 mt-2 w-[min(92vw,30rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <CustomerForm businessId={businessId} />
              </div>
            </details>
          }
        />
        <div className="px-5 py-4">
          <form className="flex flex-wrap items-end gap-2" action={`/dashboard/businesses/${businessId}/customers`}>
            <div className="min-w-48 flex-1">
              <label className="label" htmlFor="q">Search</label>
              <input id="q" name="q" defaultValue={q ?? ""} className="field" placeholder="Name, email or phone" />
            </div>
            <div>
              <label className="label" htmlFor="status">Stage</label>
              <select id="status" name="status" defaultValue={statusFilter ?? ""} className="field">
                <option value="">All stages</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-secondary">Filter</button>
          </form>
        </div>
      </Card>

      <Card>
        <CardHeader title={`${rows.length} customer${rows.length === 1 ? "" : "s"}`} description="Newest first" />
        {rows.length === 0 ? (
          <EmptyState
            title={search || statusFilter ? "No customers match that filter" : "No customers yet"}
            description={
              search || statusFilter
                ? "Try a different search or clear the stage filter."
                : "Add your first customer with the button above. Everything else in BookedOut builds on this list."
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((customer) => (
              <li key={customer.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                      {initials(customer.full_name)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{customer.full_name}</p>
                        <Badge tone={TONE[customer.status]}>{customer.status}</Badge>
                        {!customer.whatsapp_opt_in && <Badge tone="amber">no WhatsApp</Badge>}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-slate-600">
                        {[customer.email, customer.phone].filter(Boolean).join(" · ") || "No contact details"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Added {formatDate(customer.created_at)} · Last contact {formatDate(customer.last_contacted_at)}
                      </p>
                      {(customer.tags ?? []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(customer.tags ?? []).map((tag) => (
                            <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative flex items-center gap-1">
                    <details className="group">
                      <summary className="btn-ghost list-none">Edit</summary>
                      <div className="absolute right-0 top-full z-30 mt-2 w-[min(92vw,30rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                        <CustomerForm businessId={businessId} customer={customer} />
                      </div>
                    </details>
                    <form action={deleteCustomerAction}>
                      <input type="hidden" name="business_id" value={businessId} />
                      <input type="hidden" name="customer_id" value={customer.id} />
                      <button type="submit" className="btn-danger">Delete</button>
                    </form>
                  </div>
                </div>

                {customer.notes && (
                  <details className="mt-3">
                    <summary className="text-xs font-medium text-slate-500 hover:text-slate-800">View notes</summary>
                    <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-700">
                      {customer.notes}
                    </p>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function CustomerForm({ businessId, customer }: { businessId: string; customer?: Customer }) {
  return (
    <form action={customer ? updateCustomerAction : createCustomerAction} className="space-y-3">
      <input type="hidden" name="business_id" value={businessId} />
      {customer && <input type="hidden" name="customer_id" value={customer.id} />}

      <div>
        <label className="label" htmlFor={`name-${customer?.id ?? "new"}`}>Full name</label>
        <input
          id={`name-${customer?.id ?? "new"}`}
          name="full_name"
          required
          defaultValue={customer?.full_name ?? ""}
          className="field"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" defaultValue={customer?.email ?? ""} className="field" />
        </div>
        <div>
          <label className="label">Phone (international)</label>
          <input name="phone" defaultValue={customer?.phone ?? ""} className="field" placeholder="+1 555 010 2030" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Stage</label>
          <select name="status" defaultValue={customer?.status ?? "lead"} className="field">
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Tags (comma separated)</label>
          <input name="tags" defaultValue={(customer?.tags ?? []).join(", ")} className="field" placeholder="colour, regular" />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea name="notes" rows={3} defaultValue={customer?.notes ?? ""} className="field" placeholder="Preferences, history, anything useful" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="whatsapp_opt_in"
          defaultChecked={customer?.whatsapp_opt_in ?? true}
          className="h-4 w-4 rounded border-slate-300"
        />
        Happy to receive WhatsApp messages
      </label>
      <button type="submit" className="btn-primary w-full">
        {customer ? "Save changes" : "Add customer"}
      </button>
    </form>
  );
}
