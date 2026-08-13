/** Converts a listing name into a URL-safe marketplace slug. */
export function slugifyName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `listing-${Math.random().toString(36).slice(2, 8)}`;
}
