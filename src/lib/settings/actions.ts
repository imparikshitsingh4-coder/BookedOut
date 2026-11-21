"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function back(path: string, key: "message" | "error", message: string): never {
  revalidatePath(path);
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

export async function updateBusinessAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const path = `/dashboard/businesses/${businessId}/settings`;

  if (!businessId) redirect("/dashboard");

  const name = text(formData, "name");
  if (!name) back(path, "error", "Your business needs a name.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .update({
      name,
      description: text(formData, "description") || null,
      industry: text(formData, "industry") || null,
      contact_email: text(formData, "contact_email") || null,
      contact_phone: text(formData, "contact_phone") || null,
      whatsapp_number: text(formData, "whatsapp_number") || null,
      website: text(formData, "website") || null,
      review_link: text(formData, "review_link") || null,
      timezone: text(formData, "timezone") || "UTC",
      currency: text(formData, "currency") || "USD",
    })
    .eq("id", businessId)
    .select("id");

  if (error) back(path, "error", error.message);
  if (!data || data.length === 0) back(path, "error", "Only owners and admins can change business settings.");

  back(path, "message", "Business details saved.");
}

export async function saveBrandKitAction(formData: FormData) {
  const businessId = text(formData, "business_id");
  const path = `/dashboard/businesses/${businessId}/settings`;

  if (!businessId) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("brand_kits").upsert(
    {
      business_id: businessId,
      logo_url: text(formData, "logo_url") || null,
      primary_color: text(formData, "primary_color") || "#2559c7",
      secondary_color: text(formData, "secondary_color") || "#0f172a",
      accent_color: text(formData, "accent_color") || "#f59e0b",
      heading_font: text(formData, "heading_font") || "Inter",
      body_font: text(formData, "body_font") || "Inter",
      tone: text(formData, "tone") || null,
      signature: text(formData, "signature") || null,
      updated_by: user.id,
    },
    { onConflict: "business_id" },
  );

  if (error) back(path, "error", error.message);
  back(path, "message", "Brand kit saved.");
}

export async function updateProfileAction(formData: FormData) {
  const fullName = text(formData, "full_name");
  const path = "/dashboard/account";

  if (!fullName) back(path, "error", "Add your name.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) back(path, "error", error.message);

  back(path, "message", "Profile updated.");
}

export async function changePasswordAction(formData: FormData) {
  const path = "/dashboard/account";
  const currentPassword = String(formData.get("current_password") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  if (password.length < 8) back(path, "error", "Your new password must be at least 8 characters.");
  if (password !== confirmPassword) back(path, "error", "The new passwords do not match.");
  if (!currentPassword) back(path, "error", "Enter your current password.");

  // Re-authenticate before changing the password.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) back(path, "error", "Your current password is not correct.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) back(path, "error", error.message);

  back(path, "message", "Password changed.");
}
