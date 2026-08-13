const HEX = "0123456789abcdef";

export function generateToken(teamSlug: string): { token: string; prefix: string } {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let secret = "";
  for (const b of bytes) secret += HEX[b >> 4]! + HEX[b & 15]!;
  const shortTeam = teamSlug.replace(/[^a-z0-9]/g, "").slice(0, 8) || "team";
  const token = `afk_${shortTeam}_${secret}`;
  return { token, prefix: token.slice(0, 16) };
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
