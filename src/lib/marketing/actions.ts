"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const PLATFORMS = ["instagram", "facebook", "whatsapp", "tiktok", "linkedin", "email"] as const;
const STATUSES = ["idea", "draft", "scheduled", "published"] as const;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function back(businessId: string, key: "message" | "error", message: string): never {
  revalidatePath(`/dashboard/businesses/${businessId}/marketing`);
  revalidatePath(`/dashboard/businesses/${businessId}`);
  redirect(`/dashboard/businesses/${businessId}/marketing?${key}=${encodeURIComponent(message)}`);
}

function parseTimestamp(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function createPostAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const title = text(formData, "title");
  const caption = text(formData, "caption");
  const platform = text(formData, "platform");
  const status = text(formData, "status");
  const campaignId = text(formData, "campaign_id");

  if (!businessId) redirect("/dashboard");
  if (!title) back(businessId, "error", "Give the post a title.");
  if (!caption) back(businessId, "error", "Add the caption you want to post.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("marketing_posts").insert({
    business_id: businessId,
    campaign_id: campaignId || null,
    title,
    caption,
    hashtags: text(formData, "hashtags") || null,
    platform: PLATFORMS.includes(platform as (typeof PLATFORMS)[number]) ? platform : "instagram",
    status: STATUSES.includes(status as (typeof STATUSES)[number]) ? status : "draft",
    scheduled_for: parseTimestamp(text(formData, "scheduled_for")),
    created_by: user.id,
  });

  if (error) back(businessId, "error", error.message);
  back(businessId, "message", "Post saved to your content calendar.");
}

export async function updatePostStatusAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const postId = text(formData, "post_id");
  const status = text(formData, "status");

  if (!businessId || !postId || !STATUSES.includes(status as (typeof STATUSES)[number])) redirect("/dashboard");

  const supabase = await createClient();
  const { error } = await supabase
    .from("marketing_posts")
    .update({
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", postId)
    .eq("business_id", businessId);

  if (error) back(businessId, "error", error.message);
  back(businessId, "message", `Post marked ${status}.`);
}

export async function deletePostAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const postId = text(formData, "post_id");

  if (!businessId || !postId) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_posts")
    .delete()
    .eq("id", postId)
    .eq("business_id", businessId)
    .select("id");

  if (error) back(businessId, "error", error.message);
  if (!data || data.length === 0) back(businessId, "error", "Only owners and admins can delete posts.");

  back(businessId, "message", "Post deleted.");
}

export async function createCampaignAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const name = text(formData, "name");

  if (!businessId) redirect("/dashboard");
  if (!name) back(businessId, "error", "Give the campaign a name.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const startsOn = text(formData, "starts_on");
  const endsOn = text(formData, "ends_on");

  const { error } = await supabase.from("campaigns").insert({
    business_id: businessId,
    name,
    goal: text(formData, "goal") || null,
    audience: text(formData, "audience") || null,
    message: text(formData, "message") || null,
    status: STATUSES.includes(text(formData, "status") as (typeof STATUSES)[number])
      ? text(formData, "status")
      : "draft",
    starts_on: startsOn || null,
    ends_on: endsOn || null,
    created_by: user.id,
  });

  if (error) back(businessId, "error", error.message);
  back(businessId, "message", "Campaign created.");
}

export async function deleteCampaignAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const campaignId = text(formData, "campaign_id");

  if (!businessId || !campaignId) redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("business_id", businessId)
    .select("id");

  if (error) back(businessId, "error", error.message);
  if (!data || data.length === 0) back(businessId, "error", "Only owners and admins can delete campaigns.");

  back(businessId, "message", "Campaign deleted.");
}
