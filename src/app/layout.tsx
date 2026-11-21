import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BookedOut — the customer growth OS for service businesses",
    template: "%s · BookedOut",
  },
  description:
    "BookedOut brings your customers, follow-ups, reviews, referrals, marketing and design into one calm workspace. Built for salons, studios, clinics and every business that runs on repeat customers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
