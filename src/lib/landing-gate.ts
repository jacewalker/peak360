/**
 * Landing-gate primitives — Edge-runtime safe (Web Crypto only).
 *
 * Issues and verifies a short, signed cookie used by middleware to gate the
 * public marketing landing routes behind a single shared password.
 *
 * Token format: `${expiryEpochMs}.${hmacBase64Url}`
 *   - expiry: decimal epoch milliseconds (UTF-8 string of digits only)
 *   - hmacBase64Url: HMAC-SHA256(expiry, secret), base64url (no padding)
 *
 * Verification: recompute HMAC, constant-time compare bytes, then check
 * `Number(expiry) > Date.now()`.
 */

export const GATE_COOKIE_NAME = 'landing_gate';
export const GATE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function base64urlEncode(bytes: ArrayBuffer): string {
  const b = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, message: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
}

export async function signGateToken(secret: string): Promise<string> {
  const expiry = String(Date.now() + GATE_MAX_AGE_SECONDS * 1000);
  const sig = base64urlEncode(await hmac(secret, expiry));
  return `${expiry}.${sig}`;
}

export async function verifyGateToken(token: string, secret: string): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const expiry = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(expiry)) return false;
  let expected: Uint8Array;
  let got: Uint8Array;
  try {
    expected = new Uint8Array(await hmac(secret, expiry));
    got = base64urlDecode(sig);
  } catch {
    return false;
  }
  if (expected.length !== got.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ got[i];
  if (diff !== 0) return false;
  return Number(expiry) > Date.now();
}
