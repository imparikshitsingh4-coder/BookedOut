"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { makeReferralCode } from "@/lib/whatsapp";

const STATUSES = ["invited", "signed_up", "converted", "rewarded"] as const;
type ReferralStatus = (typeof STATUSES)[number];

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function back(businessId: string, key: "message" | "error", message: string): never {
  revalidatePath(`/dashboard/businesses/${businessId}/referrals`);
  revalidatePath(`/dashboard/businesses/${businessId}`);
  redirect(`/dashboard/businesses/${businessId}/referrals?${key}=${encodeURIComponent(message)}`);
}

export async function createReferralAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const businessName = text(formData, "business_name");
  const referredName = text(formData, "referred_name");
  const referrerId = text(formData, "referrer_customer_id");
  const codeInput = text(formData, "code").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);

  if (!businessId) redirect("/dashboard");
  if (!referredName) back(businessId, "error", "Add the name of the person being referred.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("referrals").insert({
    business_id: businessId,
    referrer_customer_id: referrerId || null,
    referred_name: referredName,
    referred_phone: text(formData, "referred_phone") || null,
    referred_email: text(formData, "referred_email") || null,
    code: codeInput || makeReferralCode(businessName),
    status: "invited",
    reward_note: text(formData, "reward_note") || null,
    created_by: user.id,
  });

  if (error) {
    if (error.code === "23505") back(businessId, "error", "That referral code is already in use. Try another.");
    back(businessId, "error", error.message);
  }

  back(businessId, "message", "Referral added.");
}

export async function updateReferralStatusAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const referralId = text(formData, "referral_id");
  const status = text(formData, "status") as ReferralStatus;

  if (!businessId || !referralId || !STATUSES.includes(status)) redirect("/dashboard");

  const supabase = await createClient();
  const { error } = await supabase
    .from("referrals")
    .update({ status })
    .eq("id", referralId)
    .eq("business_id", businessId);

  if (error) back(businessId, "error", error.message);
  back(businessId, "message", `Referral marked ${status.replace("_", " ")}.`);
}

export async function deleteReferralAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const referralId = text(formData, "referral_id");

  if (!businessId || !referralId) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("referrals")
    .delete()
    .eq("id", referralId)
    .eq("business_id", businessId)
    .select("id");

  if (error) back(businessId, "error", error.message);
  if (!data || data.length === 0) back(businessId, "error", "Only owners and admins can delete referrals.");

  back(businessId, "message", "Referral deleted.");
}
