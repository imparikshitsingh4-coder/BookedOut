"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function back(businessId: string, key: "message" | "error", message: string): never {
  revalidatePath(`/dashboard/businesses/${businessId}/reviews`);
  revalidatePath(`/dashboard/businesses/${businessId}`);
  redirect(`/dashboard/businesses/${businessId}/reviews?${key}=${encodeURIComponent(message)}`);
}

export async function requestReviewAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const customerId = text(formData, "customer_id");

  if (!businessId) redirect("/dashboard");
  if (!customerId) back(businessId, "error", "Choose the customer you want to ask.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("reviews").insert({
    business_id: businessId,
    customer_id: customerId,
    status: "requested",
    created_by: user.id,
  });

  if (error) back(businessId, "error", error.message);
  back(businessId, "message", "Review request logged. Send it with the WhatsApp button.");
}

export async function recordReviewAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const reviewId = text(formData, "review_id");
  const rating = Number(text(formData, "rating"));
  const comment = text(formData, "comment");

  if (!businessId || !reviewId) redirect("/dashboard");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    back(businessId, "error", "Choose a rating from 1 to 5 stars.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("reviews")
    .update({
      rating,
      comment: comment || null,
      status: "received",
      received_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .eq("business_id", businessId);

  if (error) back(businessId, "error", error.message);
  back(businessId, "message", "Review recorded.");
}

export async function respondToReviewAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const reviewId = text(formData, "review_id");
  const response = text(formData, "response");

  if (!businessId || !reviewId) redirect("/dashboard");
  if (!response) back(businessId, "error", "Write a short reply before saving.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("reviews")
    .update({ response, status: "responded" })
    .eq("id", reviewId)
    .eq("business_id", businessId);

  if (error) back(businessId, "error", error.message);
  back(businessId, "message", "Reply saved.");
}

export async function deleteReviewAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const reviewId = text(formData, "review_id");

  if (!businessId || !reviewId) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("business_id", businessId)
    .select("id");

  if (error) back(businessId, "error", error.message);
  if (!data || data.length === 0) back(businessId, "error", "Only owners and admins can delete reviews.");

  back(businessId, "message", "Review deleted.");
}
