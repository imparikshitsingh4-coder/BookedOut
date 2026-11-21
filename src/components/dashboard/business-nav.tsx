"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "", label: "Overview", icon: "grid" },
  { href: "/customers", label: "Customers", icon: "users" },
  { href: "/follow-ups", label: "Follow-ups", icon: "clock" },
  { href: "/reviews", label: "Reviews", icon: "star" },
  { href: "/referrals", label: "Referrals", icon: "share" },
  { href: "/marketing", label: "Marketing", icon: "megaphone" },
  { href: "/studio", label: "Creative Studio", icon: "palette" },
  { href: "/billing", label: "Billing", icon: "card" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    users: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.87M16 4.13A4 4 0 0 1 16 11",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
    star: "m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L3.6 9.8l6.5-.9z",
    share: "M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13",
    megaphone: "m3 11 18-7v16L3 13zM7 12v8",
    palette: "M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h3a6 6 0 0 0 0-10 9 9 0 0 0-3 0z",
    card: "M3 6h18v12H3zM3 10h18M7 15h4",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L6 11a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-[18px] w-[18px] shrink-0" aria-hidden>
      <path d={paths[name] ?? paths.grid} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BusinessNav({ businessId }: { businessId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/businesses/${businessId}`;

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden w-56 shrink-0 flex-col gap-1 lg:flex" aria-label="Business">
        {LINKS.map((link) => {
          const href = `${base}${link.href}`;
          const active = link.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={link.label}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <NavIcon name={link.icon} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile tabs */}
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:hidden" aria-label="Business">
        {LINKS.map((link) => {
          const href = `${base}${link.href}`;
          const active = link.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={link.label}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600",
              )}
            >
              <NavIcon name={link.icon} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
