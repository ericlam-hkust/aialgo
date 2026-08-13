import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Records that the user accepted a risk disclosure before activating a model or plan. */
export const acknowledgeDisclosure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { scope: string; reference?: string; version?: string }) => {
    if (!data.scope) throw new Error("scope is required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("compliance_acks").insert({
      user_id: context.userId,
      scope: data.scope,
      reference: data.reference ?? null,
      version: data.version ?? "v1",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyDisclosures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("compliance_acks")
      .select("id,scope,reference,version,acknowledged_at")
      .eq("user_id", context.userId)
      .order("acknowledged_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });
