"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Absolute origin of this request, used to build auth redirect links. */
async function getOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function signUpAction(formData: FormData) {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  const fullName = field(formData, "full_name");

  if (!email || !fullName || !password) fail("/signup", "Please fill in every field.");
  if (password.length < 8) fail("/signup", "Password must be at least 8 characters.");

  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      data: { full_name: fullName },
    },
  });

  if (error) fail("/signup", error.message);
  if (!data.session) redirect("/signup?message=check-email");
  redirect("/dashboard");
}

export async function signInAction(formData: FormData) {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  const next = field(formData, "next");

  if (!email || !password) fail("/login", "Enter your email and password.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) fail("/login", error.message);

  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  redirect(target);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?message=signed-out");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = field(formData, "email");
  if (!email) fail("/forgot-password", "Enter the email address for your account.");

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Supabase does not reveal whether an address exists; always show the same
  // confirmation so accounts cannot be enumerated.
  if (error) fail("/forgot-password", error.message);
  redirect("/forgot-password?message=check-email");
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) fail("/reset-password", "Password must be at least 8 characters.");
  if (password !== confirmPassword) fail("/reset-password", "Passwords do not match.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) fail("/forgot-password", "That reset link has expired. Request a new one.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) fail("/reset-password", error.message);

  redirect("/dashboard?message=password-updated");
}
