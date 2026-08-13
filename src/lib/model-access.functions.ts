import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const modelId = z.string().uuid();

export const setModelNamespace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ modelId, teamId: z.string().uuid().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_models")
      .update({ team_id: data.teamId })
      .eq("id", data.modelId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setModelVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ modelId, visibility: z.enum(["public", "unlisted", "private"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_models")
      .update({ visibility: data.visibility })
      .eq("id", data.modelId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Private and unlisted models the signed-in user can reach through a grant. */
export const listSharedWithMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_models")
      .select("id, slug, name, tagline, status, visibility, team_id, sharpe, cagr, max_drawdown")
      .neq("visibility", "public")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
