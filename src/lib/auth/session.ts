const SESSION_SECRET_SALT = 'peak360-session-v1';

function hexEncode(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getRandomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return hexEncode(array.buffer);
}

async function hmacSign(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return hexEncode(signature);
}

async function getSigningKey(adminPassword: string): Promise<string> {
  return hmacSign(SESSION_SECRET_SALT, adminPassword);
}

/**
 * Creates a signed session token: randomId.date.signature
 * The token contains no password material and cannot be forged
 * without knowing the admin password.
 */
export async function createSessionToken(adminPassword: string): Promise<string> {
  const sessionId = getRandomHex(32);
  const date = new Date().toISOString().slice(0, 10);
  const payload = `${sessionId}.${date}`;
  const signingKey = await getSigningKey(adminPassword);
  const signature = await hmacSign(signingKey, payload);
  return `${payload}.${signature}`;
}

/**
 * Validates a session token by verifying:
 * 1. The token has the correct format (id.date.signature)
 * 2. The date matches today (sessions expire daily)
 * 3. The HMAC signature is valid (timing-safe comparison)
 */
export async function validateSessionToken(
  token: string,
  adminPassword: string
): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [sessionId, date, signature] = parts;
  if (!sessionId || !date || !signature) return false;

  const today = new Date().toISOString().slice(0, 10);
  if (date !== today) return false;

  const payload = `${sessionId}.${date}`;
  const signingKey = await getSigningKey(adminPassword);
  const expectedSignature = await hmacSign(signingKey, payload);

  return timingSafeCompare(signature, expectedSignature);
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Uses constant-time XOR comparison.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
