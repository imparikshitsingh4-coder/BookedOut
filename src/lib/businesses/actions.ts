"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "business"
  );
}

export async function createBusinessAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();

  if (!name) {
    redirect("/dashboard?error=" + encodeURIComponent("Give your business a name."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const slug = `${slugify(name)}-${crypto.randomUUID().slice(0, 6)}`;

  // The database trigger adds the owner membership, brand kit and test-mode
  // subscription for this business; the client cannot choose those itself.
  const { error } = await supabase
    .from("businesses")
    .insert({ name, slug, industry: industry || null, created_by: user.id });

  if (error) {
    redirect("/dashboard?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=business-created");
}
