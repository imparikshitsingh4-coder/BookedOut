export type PlanId = "starter" | "growth" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  cadence: string;
  tagline: string;
  features: string[];
  highlighted?: boolean;
};

/**
 * Plan catalogue. Prices are shown as marketing copy only: billing in this build
 * runs in explicit test mode (no provider connected, no card charged).
 */
export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    cadence: "forever",
    tagline: "Everything one person needs to stay organised.",
    features: [
      "1 business, 1 user",
      "Up to 250 customers",
      "Follow-ups and reminders",
      "WhatsApp message templates",
      "Review requests and QR code",
      "Creative Studio with PNG export",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 29,
    cadence: "per month",
    tagline: "For growing teams that live on repeat business.",
    highlighted: true,
    features: [
      "Up to 5 team members",
      "Unlimited customers",
      "Referral tracking and win-back lists",
      "Marketing toolkit and content calendar",
      "Brand kit and saved designs",
      "Business analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 79,
    cadence: "per month",
    tagline: "For multi-location and high-volume businesses.",
    features: [
      "Unlimited team members",
      "Multiple businesses per account",
      "Advanced analytics",
      "Priority support",
      "Everything in Growth",
    ],
  },
];

export function getPlan(id: string | null | undefined): Plan {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[0];
}

export const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
};
