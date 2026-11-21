import type { PlanId } from "@/lib/billing/plans";

/**
 * Payment integration architecture.
 *
 * The app talks to a `PaymentProvider` and never to a vendor SDK directly, so a
 * real provider (for example Stripe) can be added by implementing this interface
 * in a server-only module and selecting it with PAYMENTS_PROVIDER.
 *
 * This build ships ONLY the test provider. It deliberately does not simulate a
 * successful card payment: it records a 14-day trial locally and tells the user
 * plainly that no charge was made. There is no fake checkout receipt.
 */

export type CheckoutRequest = {
  businessId: string;
  plan: PlanId;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutResult = {
  /** "test" means no external checkout happened and no money moved. */
  mode: "test" | "live";
  checkoutUrl: string | null;
  message: string;
};

export interface PaymentProvider {
  readonly name: string;
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  /** Real providers verify a signed webhook and return the mapped status. */
  parseWebhook?(body: string, signature: string | null): Promise<{ businessId: string; status: string } | null>;
}

class TestPaymentProvider implements PaymentProvider {
  readonly name = "test";

  async createCheckout(): Promise<CheckoutResult> {
    return {
      mode: "test",
      checkoutUrl: null,
      message:
        "Test mode: no payment provider is connected, no card was requested and no money was charged.",
    };
  }
}

export function getPaymentProvider(): PaymentProvider {
  const configured = (process.env.PAYMENTS_PROVIDER ?? "test").trim().toLowerCase();

  if (configured === "test" || configured === "") {
    return new TestPaymentProvider();
  }

  // A real provider must be wired up in server-only code with its own secret.
  // Failing loudly is safer than silently pretending it worked.
  throw new Error(
    `PAYMENTS_PROVIDER="${configured}" is not implemented in this build. Only "test" is available. ` +
      "Add a server-only provider implementing PaymentProvider before enabling live billing.",
  );
}

export function isTestBilling() {
  return (process.env.PAYMENTS_PROVIDER ?? "test").trim().toLowerCase() === "test";
}
