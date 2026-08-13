import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<any, any, any>;

export async function contributorIdFor(supabase: Client, userId: string): Promise<string | null> {
  const { data } = await supabase.from("contributor_profiles").select("id").eq("user_id", userId).maybeSingle();
  return data?.id ?? null;
}

export function periodKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
