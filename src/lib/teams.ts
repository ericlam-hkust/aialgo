export type TeamRole = "owner" | "maintainer" | "viewer";
export type ModelVisibility = "public" | "unlisted" | "private";
export type ModelAccessRole = "viewer" | "beta_tester";

export const TEAM_ROLES: { value: TeamRole; label: string; hint: string }[] = [
  { value: "owner", label: "Owner", hint: "Full control, including billing, deleting the team and transferring models." },
  { value: "maintainer", label: "Maintainer", hint: "Can publish models, manage visibility, and issue API tokens." },
  { value: "viewer", label: "Viewer", hint: "Read-only access to team models, tokens metadata and reports." },
];

export const TOKEN_SCOPES: { value: string; label: string; hint: string }[] = [
  { value: "models:read", label: "models:read", hint: "List and read team models, including private ones." },
  { value: "models:write", label: "models:write", hint: "Create model drafts and update metadata or visibility." },
  { value: "backtests:run", label: "backtests:run", hint: "Queue sandbox and validation backtests." },
  { value: "signals:read", label: "signals:read", hint: "Read generated signals for team models." },
  { value: "executions:write", label: "executions:write", hint: "Submit executions and fills back to the platform." },
];

export const VISIBILITY_OPTIONS: { value: ModelVisibility; label: string; hint: string }[] = [
  { value: "public", label: "Public", hint: "Listed in the marketplace catalog and indexed." },
  { value: "unlisted", label: "Unlisted", hint: "Hidden from the catalog — reachable by direct link only." },
  { value: "private", label: "Private", hint: "Only the team and invited testers can see it, in the app and via the API." },
];

export const MODEL_ACCESS_ROLES: { value: ModelAccessRole; label: string }[] = [
  { value: "viewer", label: "Viewer" },
  { value: "beta_tester", label: "Beta tester" },
];

/** Repo-style identifier, e.g. "quantlab/momentum-v2". */
export function namespacedSlug(teamSlug: string | null | undefined, modelSlug: string) {
  return teamSlug ? `${teamSlug}/${modelSlug}` : modelSlug;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
