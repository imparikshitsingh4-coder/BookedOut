"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const CHANNELS = ["whatsapp", "call", "email", "in_person"] as const;
type Channel = (typeof CHANNELS)[number];

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function back(businessId: string, key: "message" | "error", message: string): never {
  revalidatePath(`/dashboard/businesses/${businessId}/follow-ups`);
  revalidatePath(`/dashboard/businesses/${businessId}`);
  redirect(`/dashboard/businesses/${businessId}/follow-ups?${key}=${encodeURIComponent(message)}`);
}

function parseDue(value: string) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export async function createFollowUpAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const title = text(formData, "title");
  const customerId = text(formData, "customer_id");
  const channel = text(formData, "channel") as Channel;
  const notes = text(formData, "notes");

  if (!businessId) redirect("/dashboard");
  if (!title) back(businessId, "error", "Give the follow-up a short title.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("follow_ups").insert({
    business_id: businessId,
    customer_id: customerId || null,
    title,
    notes: notes || null,
    channel: CHANNELS.includes(channel) ? channel : "whatsapp",
    due_at: parseDue(text(formData, "due_at")),
    created_by: user.id,
  });

  if (error) back(businessId, "error", error.message);
  back(businessId, "message", "Follow-up scheduled.");
}

export async function completeFollowUpAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const followUpId = text(formData, "follow_up_id");
  const customerId = text(formData, "customer_id");

  if (!businessId || !followUpId) redirect("/dashboard");

  const supabase = await createClient();
  const { error } = await supabase
    .from("follow_ups")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", followUpId)
    .eq("business_id", businessId);

  if (error) back(businessId, "error", error.message);

  if (customerId) {
    await supabase
      .from("customers")
      .update({ last_contacted_at: new Date().toISOString() })
      .eq("id", customerId)
      .eq("business_id", businessId);
  }

  back(businessId, "message", "Follow-up completed.");
}

export async function snoozeFollowUpAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const followUpId = text(formData, "follow_up_id");

  if (!businessId || !followUpId) redirect("/dashboard");

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("follow_ups")
    .select("due_at")
    .eq("id", followUpId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (readError) back(businessId, "error", readError.message);
  if (!current) back(businessId, "error", "That follow-up no longer exists.");

  const next = new Date(current.due_at as string);
  next.setDate(next.getDate() + 1);

  const { error } = await supabase
    .from("follow_ups")
    .update({ due_at: next.toISOString(), status: "pending" })
    .eq("id", followUpId)
    .eq("business_id", businessId);

  if (error) back(businessId, "error", error.message);
  back(businessId, "message", "Snoozed for one day.");
}

export async function deleteFollowUpAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const followUpId = text(formData, "follow_up_id");

  if (!businessId || !followUpId) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("follow_ups")
    .delete()
    .eq("id", followUpId)
    .eq("business_id", businessId)
    .select("id");

  if (error) back(businessId, "error", error.message);
  if (!data || data.length === 0) back(businessId, "error", "Only owners and admins can delete follow-ups.");

  back(businessId, "message", "Follow-up deleted.");
}
