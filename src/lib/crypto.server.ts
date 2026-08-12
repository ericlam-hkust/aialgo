const enc = new TextEncoder();
const dec = new TextDecoder();

async function aesKey(): Promise<CryptoKey> {
  const secret = process.env["DATA_ENCRYPTION_KEY"];
  if (!secret) throw new Error("DATA_ENCRYPTION_KEY is not configured");
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(value: string): Uint8Array {
  const raw = atob(value);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function encryptSecret(plain: string): Promise<string> {
  const key = await aesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain));
  return `${toB64(iv)}.${toB64(new Uint8Array(ct))}`;
}

export async function decryptSecret(payload: string): Promise<string> {
  const [ivPart, ctPart] = payload.split(".");
  if (!ivPart || !ctPart) throw new Error("Malformed encrypted value");
  const key = await aesKey();
  const iv = fromB64(ivPart);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, fromB64(ctPart));
  return dec.decode(pt);
}

export function maskSuffix(value: string): string {
  return value.length <= 4 ? "****" : value.slice(-4);
}
