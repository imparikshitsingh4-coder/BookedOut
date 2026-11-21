import Link from "next/link";

import { loadBusiness } from "@/lib/businesses/context";
import { saveBrandKitAction, updateBusinessAction } from "@/lib/settings/actions";
import { ImageInput } from "@/components/image-input";
import { ErrorNotice, Notice } from "@/components/form";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "KES", "ZAR", "CAD", "AUD", "INR", "BRL", "AED", "SGD"];
const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Lagos",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { businessId } = await params;
  const { message, error } = await searchParams;
  const { supabase, business, brandKit, role } = await loadBusiness(businessId);

  const { data: members } = await supabase
    .from("business_members")
    .select("user_id, role")
    .eq("business_id", businessId);

  const memberIds = (members ?? []).map((member) => member.user_id as string);
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", memberIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> };
  const nameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

  const canEdit = role === "owner" || role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your business details, brand kit and team." />

      {message && <Notice>{message}</Notice>}
      {error && <ErrorNotice>{error}</ErrorNotice>}
      {!canEdit && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          You have staff access. Only owners and admins can change these settings.
        </p>
      )}

      <Card>
        <CardHeader title="Business details" description="Used across messages, posters and analytics." />
        <form action={updateBusinessAction} className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <input type="hidden" name="business_id" value={businessId} />
          <div>
            <label className="label">Business name</label>
            <input name="name" required defaultValue={business.name} className="field" />
          </div>
          <div>
            <label className="label">Industry</label>
            <input name="industry" defaultValue={business.industry ?? ""} className="field" placeholder="Salon, gym, clinic…" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea name="description" rows={3} defaultValue={business.description ?? ""} className="field" />
          </div>
          <div>
            <label className="label">Contact email</label>
            <input name="contact_email" type="email" defaultValue={business.contact_email ?? ""} className="field" />
          </div>
          <div>
            <label className="label">Contact phone</label>
            <input name="contact_phone" defaultValue={business.contact_phone ?? ""} className="field" />
          </div>
          <div>
            <label className="label">WhatsApp number</label>
            <input
              name="whatsapp_number"
              defaultValue={business.whatsapp_number ?? ""}
              className="field"
              placeholder="+1 555 010 2030"
            />
          </div>
          <div>
            <label className="label">Website</label>
            <input name="website" defaultValue={business.website ?? ""} className="field" placeholder="https://" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Review link</label>
            <input
              name="review_link"
              defaultValue={business.review_link ?? ""}
              className="field"
              placeholder="Google, Trustpilot or Facebook review page"
            />
            <p className="mt-1 text-xs text-slate-500">
              Used by review requests and to generate your review QR code.
            </p>
          </div>
          <div>
            <label className="label">Timezone</label>
            <select name="timezone" defaultValue={business.timezone} className="field">
              {Array.from(new Set([business.timezone, ...TIMEZONES])).map((zone) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Currency</label>
            <select name="currency" defaultValue={business.currency} className="field">
              {Array.from(new Set([business.currency, ...CURRENCIES])).map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={!canEdit}>
              Save business details
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Brand kit" description="The Creative Studio starts from these colours and fonts." />
        <form action={saveBrandKitAction} className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <input type="hidden" name="business_id" value={businessId} />
          <div className="sm:col-span-2">
            <ImageInput name="logo_url" defaultValue={brandKit?.logo_url ?? business.logo_url ?? ""} label="Logo" />
          </div>
          <div>
            <label className="label">Primary colour</label>
            <input
              type="color"
              name="primary_color"
              defaultValue={brandKit?.primary_color ?? "#2559c7"}
              className="h-10 w-full cursor-pointer rounded-xl border border-slate-300"
            />
          </div>
          <div>
            <label className="label">Secondary colour</label>
            <input
              type="color"
              name="secondary_color"
              defaultValue={brandKit?.secondary_color ?? "#0f172a"}
              className="h-10 w-full cursor-pointer rounded-xl border border-slate-300"
            />
          </div>
          <div>
            <label className="label">Accent colour</label>
            <input
              type="color"
              name="accent_color"
              defaultValue={brandKit?.accent_color ?? "#f59e0b"}
              className="h-10 w-full cursor-pointer rounded-xl border border-slate-300"
            />
          </div>
          <div>
            <label className="label">Tone of voice</label>
            <input
              name="tone"
              defaultValue={brandKit?.tone ?? ""}
              className="field"
              placeholder="Warm, expert, no jargon"
            />
          </div>
          <div>
            <label className="label">Heading font</label>
            <select name="heading_font" defaultValue={brandKit?.heading_font ?? "Inter"} className="field">
              {["Inter", "Georgia", "Arial", "Trebuchet MS", "Times New Roman", "Courier New"].map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Body font</label>
            <select name="body_font" defaultValue={brandKit?.body_font ?? "Inter"} className="field">
              {["Inter", "Georgia", "Arial", "Trebuchet MS", "Times New Roman", "Courier New"].map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Message signature</label>
            <input
              name="signature"
              defaultValue={brandKit?.signature ?? ""}
              className="field"
              placeholder="— The team at your business"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={!canEdit}>
              Save brand kit
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Team" description="Roles are enforced by the database, not just the interface." />
        <ul className="divide-y divide-slate-100">
          {(members ?? []).map((member) => (
            <li key={member.user_id} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="text-sm text-slate-700">
                {nameById.get(member.user_id) ?? "Team member"}
              </span>
              <Badge tone={member.role === "owner" ? "violet" : member.role === "admin" ? "brand" : "slate"}>
                {member.role}
              </Badge>
            </li>
          ))}
        </ul>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          To add a teammate, create their BookedOut account first, then insert a membership row. Seats are part of
          your plan, and billing stays in test mode.
        </p>
      </Card>

      <Card>
        <CardHeader title="Billing & plan" description="Change plan, trial and cancellation." />
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-sm text-slate-600">Manage your subscription on the billing screen.</p>
          <Link href={`/dashboard/businesses/${businessId}/billing`} className="btn-secondary">
            Open billing
          </Link>
        </div>
      </Card>

      <p className="text-xs text-slate-400">
        Business created {formatDate(business.created_at)} · slug /{business.slug}
      </p>
    </div>
  );
}
