"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type DesignLayer = {
  id: string;
  type: "text" | "shape" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  align?: "left" | "center" | "right";
  shape?: "rect" | "circle" | "line";
  radius?: number;
  opacity?: number;
  src?: string;
};

export type DesignData = {
  background: string;
  backgroundSecondary: string;
  useGradient: boolean;
  layers: DesignLayer[];
};

export type SaveDesignResult = { ok: boolean; message: string; id?: string };

export async function saveDesignAction(input: {
  businessId: string;
  designId?: string | null;
  name: string;
  width: number;
  height: number;
  data: DesignData;
}): Promise<SaveDesignResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Your session expired. Sign in again." };
  if (!input.name.trim()) return { ok: false, message: "Give the design a name before saving." };

  if (input.designId) {
    const { error } = await supabase
      .from("designs")
      .update({ name: input.name.trim(), width: input.width, height: input.height, data: input.data })
      .eq("id", input.designId)
      .eq("business_id", input.businessId);

    if (error) return { ok: false, message: error.message };
    revalidatePath(`/dashboard/businesses/${input.businessId}/studio`);
    return { ok: true, message: "Design updated.", id: input.designId };
  }

  const { data, error } = await supabase
    .from("designs")
    .insert({
      business_id: input.businessId,
      name: input.name.trim(),
      width: input.width,
      height: input.height,
      data: input.data,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath(`/dashboard/businesses/${input.businessId}/studio`);
  return { ok: true, message: "Design saved.", id: data.id as string };
}

export async function deleteDesignAction(input: { businessId: string; designId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("designs")
    .delete()
    .eq("id", input.designId)
    .eq("business_id", input.businessId)
    .select("id");

  if (error) return { ok: false, message: error.message };
  if (!data || data.length === 0) return { ok: false, message: "Only owners and admins can delete designs." };

  revalidatePath(`/dashboard/businesses/${input.businessId}/studio`);
  return { ok: true, message: "Design deleted." };
}
