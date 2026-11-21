"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPaymentProvider } from "@/lib/billing/provider";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function back(businessId: string, key: "message" | "error", message: string): never {
  revalidatePath(`/dashboard/businesses/${businessId}/billing`);
  redirect(`/dashboard/businesses/${businessId}/billing?${key}=${encodeURIComponent(message)}`);
}

async function origin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function choosePlanAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const plan = text(formData, "plan") as PlanId;

  if (!businessId) redirect("/dashboard");
  if (!PLANS.some((entry) => entry.id === plan)) back(businessId, "error", "Choose a valid plan.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  let checkout;
  try {
    checkout = await getPaymentProvider().createCheckout({
      businessId,
      plan,
      customerEmail: user.email,
      successUrl: `${await origin()}/dashboard/businesses/${businessId}/billing`,
      cancelUrl: `${await origin()}/dashboard/businesses/${businessId}/billing`,
    });
  } catch (error) {
    back(businessId, "error", (error as Error).message);
  }

  // In this build the only provider is the test provider. It records a trial
  // locally and never claims that a payment happened.
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  const { error } = await supabase.from("subscriptions").upsert(
    {
      business_id: businessId,
      plan,
      status: "trialing",
      provider: checkout.mode === "test" ? "test" : "live",
      trial_ends_at: trialEnds.toISOString(),
      current_period_end: null,
      canceled_at: null,
    },
    { onConflict: "business_id" },
  );

  if (error) back(businessId, "error", error.message);

  back(businessId, "message", `${checkout.message} Plan set to ${plan}.`);
}

export async function cancelSubscriptionAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  if (!businessId) redirect("/dashboard");

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("business_id", businessId);

  if (error) back(businessId, "error", error.message);
  back(businessId, "message", "Subscription canceled. Your data is kept.");
}

export async function resumeSubscriptionAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  if (!businessId) redirect("/dashboard");

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "trialing", canceled_at: null })
    .eq("business_id", businessId);

  if (error) back(businessId, "error", error.message);
  back(businessId, "message", "Subscription resumed in test mode.");
}
