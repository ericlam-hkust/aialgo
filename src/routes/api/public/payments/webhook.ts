import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient<any, any, any>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<any, any, any>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}

function priceIdOf(item: any): string | null {
  return item?.price?.lookup_key ?? item?.price?.metadata?.lovable_external_id ?? item?.price?.id ?? null;
}

function iso(seconds: number | null | undefined) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }
  const item = subscription.items?.data?.[0];
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        product_id: typeof item?.price?.product === "string" ? item.price.product : null,
        price_id: priceIdOf(item),
        status: subscription.status,
        current_period_start: iso(periodStart),
        current_period_end: iso(periodEnd),
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" },
    );

  // Keep the profile's marketing tier label in sync so the UI can read it cheaply.
  const priceId = priceIdOf(item) ?? "";
  const tier = priceId.startsWith("elite") ? "elite" : priceId.startsWith("pro") ? "pro" : "free";
  const active = ["active", "trialing", "past_due"].includes(subscription.status);
  await getSupabase()
    .from("profiles")
    .update({ subscription_tier: active ? tier : "free" })
    .eq("id", userId);
}

async function markCanceled(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  const userId = subscription.metadata?.userId;
  if (userId) {
    await getSupabase().from("profiles").update({ subscription_tier: "free" }).eq("id", userId);
  }
}

/** Records a marketplace model purchase plus the 80/20 revenue split. */
async function fulfillModelPurchase(session: any, env: StripeEnv) {
  const meta = session.metadata ?? {};
  if (meta.kind !== "model_purchase" || !meta.modelId || !meta.userId) return;

  const supabase = getSupabase();
  const { data: model } = await supabase
    .from("ai_models")
    .select("id,name,price,currency,pricing_model,contributor_id,active_users")
    .eq("id", meta.modelId)
    .maybeSingle();
  if (!model) return;

  const { data: settings } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "commission")
    .maybeSingle();
  const rate = Number((settings?.value as { rate?: number } | null)?.rate ?? 0.2);
  const gross = Number(session.amount_total ?? 0) / 100 || Number(model.price ?? 0);
  const commission = Math.round(gross * rate * 100) / 100;

  const { data: purchase } = await supabase
    .from("model_purchases")
    .insert({
      model_id: model.id,
      user_id: meta.userId,
      pricing_model: model.pricing_model,
      amount: gross,
      currency: model.currency ?? "HKD",
      status: "active",
      stripe_session_id: session.id,
      stripe_subscription_id: session.subscription ?? null,
      environment: env,
    })
    .select("id")
    .maybeSingle();

  await supabase.from("model_transactions").insert({
    model_id: model.id,
    model_name: model.name,
    contributor_id: model.contributor_id,
    buyer_id: meta.userId,
    kind: "purchase",
    gross_amount: gross,
    commission_amount: commission,
    net_amount: Math.round((gross - commission) * 100) / 100,
    commission_rate: rate,
    currency: model.currency ?? "HKD",
    status: "settled",
  });

  await supabase
    .from("ai_models")
    .update({ active_users: Number(model.active_users ?? 0) + 1 })
    .eq("id", model.id);

  const { notify } = await import("@/lib/notify.server");
  const notifications = [
    {
      userId: meta.userId as string,
      kind: "model_purchase" as const,
      title: `Purchase confirmed — ${model.name}`,
      body: "Your model is ready. Configure risk limits and activate it from My models.",
      link: "/dashboard/my-models",
    },
  ];
  const { data: contributor } = await supabase
    .from("contributor_profiles")
    .select("user_id")
    .eq("id", model.contributor_id)
    .maybeSingle();
  if (contributor?.user_id) {
    notifications.push({
      userId: contributor.user_id,
      kind: "model_purchase" as const,
      title: `New sale — ${model.name}`,
      body: `Net earnings ${Math.round((gross - commission) * 100) / 100} ${model.currency ?? "HKD"}.`,
      link: "/dashboard/models",
    });
  }
  await notify(notifications);

  console.log("Model purchase fulfilled", { modelId: model.id, purchaseId: purchase?.id });
}

async function syncConnectAccount(account: any) {
  if (!account?.id) return;
  const status = account.payouts_enabled ? "active" : account.details_submitted ? "in_review" : "pending";
  await getSupabase().from("contributor_profiles").update({ payout_status: status }).eq("stripe_account_id", account.id);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await markCanceled(event.data.object, env);
      break;
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.payment_status !== "unpaid") await fulfillModelPurchase(session, env);
      break;
    }
    case "checkout.session.async_payment_succeeded":
      await fulfillModelPurchase(event.data.object, env);
      break;
    case "account.updated":
      await syncConnectAccount(event.data.object);
      break;
    case "invoice.paid":
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
