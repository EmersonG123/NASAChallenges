// Signed session cookie for the online system (web build only; the desktop app has no login).
// Token = base64url(payload) + "." + base64url(HMAC-SHA256(payload)). Web Crypto only, so it runs in the
// proxy and in route handlers alike.

export const SESSION_COOKIE = 'astra_session';
export const SESSION_HOURS = 12;

export type Role = 'admin' | 'operador' | 'lector';
export interface Session { u: string; r: Role; exp: number }

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ''; bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/** ASTRA_AUTH_SECRET must be set in production; a fixed fallback only keeps local development working */
function secret() {
  const s = process.env.ASTRA_AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production') console.warn('[auth] ASTRA_AUTH_SECRET missing or shorter than 16 characters: using an insecure default');
  return 'astra-dev-secret-change-me';
}
let keyP: Promise<CryptoKey> | null = null;
const key = () => (keyP ??= crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']));

export async function signSession(s: Omit<Session, 'exp'>, hours = SESSION_HOURS): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify({ ...s, exp: Date.now() + hours * 3600_000 })));
  const sig = await crypto.subtle.sign('HMAC', await key(), enc.encode(body));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await key(), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const s = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Session;
    return typeof s.exp === 'number' && s.exp > Date.now() && s.u ? s : null;
  } catch { return null; }
}
