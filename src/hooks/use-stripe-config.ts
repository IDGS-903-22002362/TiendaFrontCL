import { useState, useEffect } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { paymentsApi } from "@/lib/api/payments";

export function useStripeConfig() {
  const [stripePromise, setStripePromise] = useState<Promise<
    Stripe | null
  > | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchConfig() {
      try {
        const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (envKey) {
          if (mounted) setStripePromise(loadStripe(envKey));
          return;
        }

        const config = await paymentsApi.getConfig();
        if (mounted && config.publishableKey) {
          setStripePromise(loadStripe(config.publishableKey));
        }
      } catch (err) {
        console.error("Failed to load Stripe configuration", err);
      }
    }

    void fetchConfig();

    return () => {
      mounted = false;
    };
  }, []);

  return stripePromise;
}
