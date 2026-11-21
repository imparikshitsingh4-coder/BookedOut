import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type Business = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  timezone: string;
  currency: string;
  industry: string | null;
  website: string | null;
  whatsapp_number: string | null;
  logo_url: string | null;
  review_link: string | null;
  created_by: string | null;
  created_at: string;
};

export type BrandKit = {
  business_id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  heading_font: string;
  body_font: string;
  tone: string | null;
  signature: string | null;
};

const BUSINESS_COLUMNS =
  "id, name, slug, description, contact_email, contact_phone, timezone, currency, industry, website, whatsapp_number, logo_url, review_link, created_by, created_at";

/** Signed-in Supabase client, or a redirect to the login screen. */
export async function requireSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  return { supabase, user };
}

/**
 * Loads a business and the caller's role in it. RLS returns no row for businesses
 * the user does not belong to, so a missing row is both "not found" and "not
 * allowed" and never leaks which businesses exist.
 */
export async function loadBusiness(businessId: string) {
  const { supabase, user } = await requireSession();

  const [{ data: business }, { data: membership }, { data: brandKit }] = await Promise.all([
    supabase.from("businesses").select(BUSINESS_COLUMNS).eq("id", businessId).maybeSingle(),
    supabase
      .from("business_members")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("brand_kits").select("*").eq("business_id", businessId).maybeSingle(),
  ]);

  if (!business) notFound();

  return {
    supabase,
    user,
    business: business as Business,
    role: (membership?.role ?? "staff") as "owner" | "admin" | "staff",
    brandKit: (brandKit ?? null) as BrandKit | null,
  };
}

export type BusinessSummary = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  created_at: string;
};

export async function listMyBusinesses(): Promise<BusinessSummary[]> {
  const { supabase } = await requireSession();
  const { data } = await supabase
    .from("businesses")
    .select("id, name, slug, industry, created_at")
    .order("created_at", { ascending: true });
  return (data ?? []) as BusinessSummary[];
}
