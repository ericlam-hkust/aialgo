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

export const listModelAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ modelId }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: grants, error } = await context.supabase
      .from("model_access_grants")
      .select("id, user_id, email, role, note, created_at")
      .eq("model_id", data.modelId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return grants ?? [];
  });

export const grantModelAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        modelId,
        email: z.string().trim().email().max(200),
        role: z.enum(["viewer", "beta_tester"]),
        note: z.string().trim().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: canManage } = await context.supabase.rpc("can_manage_model", {
      _model_id: data.modelId,
      _user_id: context.userId,
    });
    if (!canManage) throw new Error("You cannot manage access for this model");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", data.email)
      .maybeSingle();

    const { error } = await context.supabase.from("model_access_grants").insert({
      model_id: data.modelId,
      user_id: profile?.id ?? null,
      email: data.email.toLowerCase(),
      role: data.role,
      note: data.note ?? null,
      granted_by: context.userId,
    });
    if (error) throw new Error(error.message.includes("duplicate") ? "That person already has access" : error.message);
    return { ok: true, pending: !profile };
  });

export const revokeModelAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ grantId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("model_access_grants").delete().eq("id", data.grantId);
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
