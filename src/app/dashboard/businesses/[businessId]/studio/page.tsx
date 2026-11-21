import { loadBusiness } from "@/lib/businesses/context";
import { PosterStudio } from "@/components/studio/poster-studio";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StudioPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const { supabase, business, brandKit } = await loadBusiness(businessId);

  const { data: designs } = await supabase
    .from("designs")
    .select("id, name, width, height, data")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(40);

  const brand = {
    primary: brandKit?.primary_color ?? "#2559c7",
    secondary: brandKit?.secondary_color ?? "#0f172a",
    accent: brandKit?.accent_color ?? "#f59e0b",
    headingFont: brandKit?.heading_font ?? "Inter",
    bodyFont: brandKit?.body_font ?? "Inter",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Creative Studio"
        description="Design posters from your brand kit, then download a print-ready PNG. Everything is editable: text, colours, shapes and images."
      />
      <PosterStudio
        businessId={business.id}
        businessName={business.name}
        brand={brand}
        savedDesigns={(designs ?? []) as Array<{ id: string; name: string; width: number; height: number; data: unknown }>}
      />
    </div>
  );
}
