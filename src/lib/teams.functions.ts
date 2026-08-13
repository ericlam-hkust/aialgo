import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateToken, hashToken } from "@/lib/teams.server";

const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]{1,39}$/, "Use lowercase letters, numbers and dashes");

export const listMyTeams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("team_members")
      .select("role, team:teams(id, slug, name, description, avatar_url, website, created_at)")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .filter((r) => r.team)
      .map((r) => ({ role: r.role, ...(r.team as NonNullable<typeof r.team>) }));
  });

export const createTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: slugSchema,
        name: z.string().trim().min(2).max(60),
        description: z.string().trim().max(500).optional(),
        website: z.string().trim().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: team, error } = await context.supabase
      .from("teams")
      .insert({
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        website: data.website ?? null,
        created_by: context.userId,
      })
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message.includes("duplicate") ? "That namespace is taken" : error.message);

    const { error: memberError } = await context.supabase
      .from("team_members")
      .insert({ team_id: team.id, user_id: context.userId, role: "owner" });
    if (memberError) throw new Error(memberError.message);
    return team;
  });

export const updateTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        teamId: z.string().uuid(),
        name: z.string().trim().min(2).max(60),
        description: z.string().trim().max(500).optional(),
        website: z.string().trim().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("teams")
      .update({ name: data.name, description: data.description ?? null, website: data.website ?? null })
      .eq("id", data.teamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ slug: slugSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: team, error } = await context.supabase
      .from("teams")
      .select("id, slug, name, description, avatar_url, website, created_by, created_at")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!team) return null;

    const [{ data: members }, { data: tokens }, { data: models }] = await Promise.all([
      context.supabase
        .from("team_members")
        .select("id, user_id, role, created_at")
        .eq("team_id", team.id)
        .order("created_at", { ascending: true }),
      context.supabase
        .from("team_api_tokens")
        .select("id, name, token_prefix, scopes, last_used_at, expires_at, revoked_at, created_at")
        .eq("team_id", team.id)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("ai_models")
        .select("id, slug, name, status, visibility, active_users, price, currency, pricing_model, updated_at")
        .eq("team_id", team.id)
        .order("updated_at", { ascending: false }),
    ]);

    const myRole = (members ?? []).find((m) => m.user_id === context.userId)?.role ?? null;

    // Emails come from an admin read because profiles are private per user.
    let emails: Record<string, string> = {};
    if (myRole) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const ids = (members ?? []).map((m) => m.user_id);
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id, email, full_name").in("id", ids);
      emails = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name || p.email || ""]));
    }

    return {
      team,
      myRole,
      canManage: myRole === "owner" || myRole === "maintainer",
      members: (members ?? []).map((m) => ({ ...m, label: emails[m.user_id] || `${m.user_id.slice(0, 8)}…` })),
      tokens: tokens ?? [],
      models: models ?? [],
    };
  });

export const addTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        teamId: z.string().uuid(),
        email: z.string().trim().email().max(200),
        role: z.enum(["owner", "maintainer", "viewer"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: canManage } = await context.supabase.rpc("can_manage_team", {
      _team_id: data.teamId,
      _user_id: context.userId,
    });
    if (!canManage) throw new Error("Only owners and maintainers can add members");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", data.email)
      .maybeSingle();
    if (!profile) throw new Error("No AlgoForge account uses that email yet");

    const { error } = await context.supabase
      .from("team_members")
      .upsert({ team_id: data.teamId, user_id: profile.id, role: data.role }, { onConflict: "team_id,user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ memberId: z.string().uuid(), role: z.enum(["owner", "maintainer", "viewer"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("team_members")
      .update({ role: data.role })
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ memberId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("team_members").delete().eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createTeamToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        teamId: z.string().uuid(),
        teamSlug: slugSchema,
        name: z.string().trim().min(2).max(60),
        scopes: z.array(z.string().max(40)).min(1).max(10),
        expiresInDays: z.number().int().min(0).max(730).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { token, prefix } = generateToken(data.teamSlug);
    const expiresAt =
      data.expiresInDays > 0 ? new Date(Date.now() + data.expiresInDays * 86_400_000).toISOString() : null;

    const { error } = await context.supabase.from("team_api_tokens").insert({
      team_id: data.teamId,
      name: data.name,
      token_prefix: prefix,
      token_hash: await hashToken(token),
      scopes: data.scopes,
      created_by: context.userId,
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);
    // Returned exactly once — only the hash is stored.
    return { token };
  });

export const revokeTeamToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ tokenId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("team_api_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.tokenId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
