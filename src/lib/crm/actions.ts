"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const CUSTOMER_STATUSES = ["lead", "active", "vip", "inactive"] as const;
type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function back(businessId: string, key: "message" | "error", message: string): never {
  revalidatePath(`/dashboard/businesses/${businessId}/customers`);
  revalidatePath(`/dashboard/businesses/${businessId}`);
  redirect(`/dashboard/businesses/${businessId}/customers?${key}=${encodeURIComponent(message)}`);
}

function parseStatus(value: string): CustomerStatus {
  return CUSTOMER_STATUSES.includes(value as CustomerStatus) ? (value as CustomerStatus) : "lead";
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function customerPayload(formData: FormData) {
  return {
    full_name: text(formData, "full_name"),
    email: text(formData, "email") || null,
    phone: text(formData, "phone") || null,
    status: parseStatus(text(formData, "status")),
    tags: parseTags(text(formData, "tags")),
    notes: text(formData, "notes") || null,
    whatsapp_opt_in: formData.get("whatsapp_opt_in") === "on",
  };
}

export async function createCustomerAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const payload = customerPayload(formData);

  if (!businessId) redirect("/dashboard");
  if (!payload.full_name) back(businessId, "error", "A customer needs a name.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("customers")
    .insert({ ...payload, business_id: businessId, created_by: user.id });

  if (error) {
    if (error.code === "23505") back(businessId, "error", "A customer with that email already exists in this business.");
    back(businessId, "error", error.message);
  }

  back(businessId, "message", `${payload.full_name} was added.`);
}

export async function updateCustomerAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const customerId = text(formData, "customer_id");
  const payload = customerPayload(formData);

  if (!businessId || !customerId) redirect("/dashboard");
  if (!payload.full_name) back(businessId, "error", "A customer needs a name.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .update(payload)
    .eq("id", customerId)
    .eq("business_id", businessId)
    .select("id");

  if (error) back(businessId, "error", error.message);
  if (!data || data.length === 0) back(businessId, "error", "That customer could not be updated.");

  back(businessId, "message", `${payload.full_name} was updated.`);
}

export async function deleteCustomerAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const customerId = text(formData, "customer_id");

  if (!businessId || !customerId) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("business_id", businessId)
    .select("id");

  if (error) back(businessId, "error", error.message);
  if (!data || data.length === 0) {
    back(businessId, "error", "Only owners and admins can delete customers.");
  }

  back(businessId, "message", "Customer deleted.");
}

export async function setCustomerStatusAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const customerId = text(formData, "customer_id");
  const status = parseStatus(text(formData, "status"));

  if (!businessId || !customerId) redirect("/dashboard");

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ status, last_contacted_at: new Date().toISOString() })
    .eq("id", customerId)
    .eq("business_id", businessId);

  if (error) back(businessId, "error", error.message);
  back(businessId, "message", status === "active" ? "Customer reactivated." : `Customer marked ${status}.`);
}
