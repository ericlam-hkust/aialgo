import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutResult = { clientSecret: string } | { error: string };

export const createModelCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { modelId: string; returnUrl: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;
    const { data: model } = await supabase
      .from("ai_models")
      .select("id,slug,name,tagline,price,currency,pricing_model,contributor_id")
      .eq("id", data.modelId)
      .maybeSingle();
    if (!model) return { error: "Model not found" };

    try {
      const stripe = createStripeClient(data.environment);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const lookupKey = `model_${model.slug}_${model.pricing_model}`.replace(/[^a-zA-Z0-9_-]/g, "_");
      const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
      let priceId = existing.data[0]?.id;

      if (!priceId) {
        const product = await stripe.products.create({
          name: model.name,
          ...(model.tagline ? { description: model.tagline } : {}),
          tax_code: "txcd_10103001",
          metadata: { modelId: model.id, slug: model.slug },
        });
        const price = await stripe.prices.create({
          product: product.id,
          currency: (model.currency ?? "HKD").toLowerCase(),
          unit_amount: Math.round(Number(model.price) * 100),
          lookup_key: lookupKey,
          ...(model.pricing_model === "subscription" ? { recurring: { interval: "month" as const } } : {}),
        });
        priceId = price.id;
      }

      let customerId: string | undefined;
      const found = await stripe.customers.search({ query: `metadata['userId']:'${userId}'`, limit: 1 });
      customerId = found.data[0]?.id;
      if (!customerId) {
        const created = await stripe.customers.create({
          ...(user?.email ? { email: user.email } : {}),
          metadata: { userId },
        });
        customerId = created.id;
      }

      const isRecurring = model.pricing_model === "subscription";
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: priceId, quantity: 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        managed_payments: { enabled: true },
        metadata: {
          userId,
          managed_payments: "true",
          modelId: model.id,
          contributorId: model.contributor_id,
          kind: "model_purchase",
        },
        ...(isRecurring
          ? {
              subscription_data: {
                metadata: { userId, modelId: model.id, contributorId: model.contributor_id, kind: "model_purchase" },
              },
            }
          : { payment_intent_data: { description: model.name } }),
      } as never);

      return { clientSecret: (session as { client_secret?: string }).client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Creates or refreshes a Stripe Connect Express onboarding link for the contributor. */
export const createConnectOnboardingLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: contributor } = await supabase
      .from("contributor_profiles")
      .select("id,stripe_account_id,country,payout_email")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contributor) return { error: "Create your contributor profile first." };

    try {
      const stripe = createStripeClient(data.environment);
      let accountId = contributor.stripe_account_id;
      if (!accountId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const account = await stripe.accounts.create({
          type: "express",
          country: contributor.country || "HK",
          ...(user?.email ? { email: user.email } : {}),
          capabilities: { transfers: { requested: true } },
          metadata: { userId, contributorId: contributor.id },
        });
        accountId = account.id;
        await supabase
          .from("contributor_profiles")
          .update({ stripe_account_id: accountId, payout_status: "pending" })
          .eq("id", contributor.id);
      }

      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: data.returnUrl,
        return_url: data.returnUrl,
        type: "account_onboarding",
      });
      return { url: link.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const refreshConnectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<{ status: string } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: contributor } = await supabase
      .from("contributor_profiles")
      .select("id,stripe_account_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!contributor?.stripe_account_id) return { error: "No payout account connected yet." };
    try {
      const stripe = createStripeClient(data.environment);
      const account = await stripe.accounts.retrieve(contributor.stripe_account_id);
      const status = account.payouts_enabled ? "active" : account.details_submitted ? "in_review" : "pending";
      await supabase.from("contributor_profiles").update({ payout_status: status }).eq("id", contributor.id);
      return { status };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
