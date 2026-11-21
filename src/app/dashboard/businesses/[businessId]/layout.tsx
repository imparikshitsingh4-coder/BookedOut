import Link from "next/link";
import { notFound } from "next/navigation";

import { BusinessNav } from "@/components/dashboard/business-nav";
import { signOutAction } from "@/lib/auth/actions";
import { hasSupabaseEnv } from "@/lib/env";
import { loadBusiness } from "@/lib/businesses/context";
import { SetupNotice } from "@/components/ui";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessId: string }>;
}) {
  if (!hasSupabaseEnv()) return <SetupNotice />;

  const { businessId } = await params;
  const { business, role, user } = await loadBusiness(businessId);

  if (!business) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              {initials(business.name)}
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{business.name}</p>
              <p className="text-xs text-slate-500 capitalize">
                {role} · {business.industry ?? "Business"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="hidden rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 sm:block"
            >
              My businesses
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400"
              >
                Sign out
              </button>
            </form>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700" title={user.email ?? ""}>
              {initials(user.email)}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <BusinessNav businessId={business.id} />
        <div className="min-w-0 flex-1 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}
