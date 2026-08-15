import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const uuid = (v: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(v)) throw new Error("Invalid id");
  return v;
};

/** Public: likes, comments and the pricing history shown on a listing page. */
export const getModelCommunity = createServerFn({ method: "GET" })
  .inputValidator((data: { modelId: string }) => ({ modelId: uuid(data.modelId) }))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const [{ data: likes }, { data: comments }, { data: history }] = await Promise.all([
      supabase.from("model_likes").select("id,verified_owner").eq("model_id", data.modelId),
      supabase
        .from("model_comments")
        .select("id,author_name,body,sentiment,sentiment_score,verified_owner,created_at")
        .eq("model_id", data.modelId)
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("model_price_history")
        .select("id,price,previous_price,mode,reason,created_at")
        .eq("model_id", data.modelId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    const rows = likes ?? [];
    return {
      likes: rows.length,
      verifiedLikes: rows.filter((l) => l.verified_owner).length,
      comments: comments ?? [],
      history: history ?? [],
    };
  });

/** Authenticated: whether the signed-in user already liked this listing. */
export const getMyEngagement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { modelId: string }) => ({ modelId: uuid(data.modelId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: like } = await supabase
      .from("model_likes")
      .select("id")
      .eq("model_id", data.modelId)
      .eq("user_id", userId)
      .maybeSingle();
    return { liked: Boolean(like) };
  });

async function isOwnerUser(supabase: any, modelId: string, userId: string) {
  const { data } = await supabase
    .from("model_activations")
    .select("id")
    .eq("model_id", modelId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

/** Like / unlike a listing. Owners' likes carry more weight in pricing. */
export const toggleModelLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { modelId: string }) => ({ modelId: uuid(data.modelId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("model_likes")
      .select("id")
      .eq("model_id", data.modelId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase.from("model_likes").delete().eq("id", existing.id);
    } else {
      const verified = await isOwnerUser(supabase, data.modelId, userId);
      const { error } = await supabase
        .from("model_likes")
        .insert({ model_id: data.modelId, user_id: userId, verified_owner: verified });
      if (error) throw new Error(error.message);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { refreshCommunityAndPrice } = await import("@/lib/community.server");
    const result = await refreshCommunityAndPrice(supabaseAdmin as never, data.modelId);
    return { liked: !existing, likes: result?.likes ?? 0 };
  });

/** Post a comment; sentiment is scored server-side and feeds automatic pricing. */
export const postModelComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { modelId: string; body: string }) => {
    const body = String(data.body ?? "").trim();
    if (body.length < 3) throw new Error("Write a little more.");
    if (body.length > 1500) throw new Error("Comment is too long.");
    return { modelId: uuid(data.modelId), body };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { count } = await supabase
      .from("model_comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= 10) throw new Error("Too many comments in the last hour. Try again later.");

    const [{ data: profile }, verified, { scoreSentiment }] = await Promise.all([
      supabase.from("profiles").select("full_name,email").eq("id", userId).maybeSingle(),
      isOwnerUser(supabase, data.modelId, userId),
      import("@/lib/community.server"),
    ]);
    const { score, label } = await scoreSentiment(data.body);

    const { error } = await supabase.from("model_comments").insert({
      model_id: data.modelId,
      user_id: userId,
      author_name: profile?.full_name ?? profile?.email?.split("@")[0] ?? "Member",
      body: data.body,
      sentiment: label,
      sentiment_score: score,
      verified_owner: verified,
    });
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { refreshCommunityAndPrice } = await import("@/lib/community.server");
    await refreshCommunityAndPrice(supabaseAdmin as never, data.modelId);
    return { ok: true, sentiment: label };
  });

/** Listing owner (or comment author) hides an abusive comment. */
export const hideModelComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { commentId: string; modelId: string; hidden: boolean }) => ({
    commentId: uuid(data.commentId),
    modelId: uuid(data.modelId),
    hidden: Boolean(data.hidden),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("model_comments")
      .update({ hidden: data.hidden })
      .eq("id", data.commentId);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { refreshCommunityAndPrice } = await import("@/lib/community.server");
    await refreshCommunityAndPrice(supabaseAdmin as never, data.modelId);
    return { ok: true };
  });
