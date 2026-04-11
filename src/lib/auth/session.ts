import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const SESSION_SECRET_SALT = 'peak360-session-v1';

/**
 * Derives an HMAC signing key from the admin password.
 * The salt ensures the signing key differs from the raw password.
 */
function getSigningKey(adminPassword: string): string {
  return createHmac('sha256', SESSION_SECRET_SALT)
    .update(adminPassword)
    .digest('hex');
}

/**
 * Creates a signed session token: randomId.date.signature
 * The token contains no password material and cannot be forged
 * without knowing the admin password.
 */
export function createSessionToken(adminPassword: string): string {
  const sessionId = randomBytes(32).toString('hex');
  const date = new Date().toISOString().slice(0, 10);
  const payload = `${sessionId}.${date}`;
  const signingKey = getSigningKey(adminPassword);
  const signature = createHmac('sha256', signingKey)
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
}

/**
 * Validates a session token by verifying:
 * 1. The token has the correct format (id.date.signature)
 * 2. The date matches today (sessions expire daily)
 * 3. The HMAC signature is valid (timing-safe comparison)
 */
export function validateSessionToken(
  token: string,
  adminPassword: string
): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [sessionId, date, signature] = parts;
  if (!sessionId || !date || !signature) return false;

  const today = new Date().toISOString().slice(0, 10);
  if (date !== today) return false;

  const payload = `${sessionId}.${date}`;
  const signingKey = getSigningKey(adminPassword);
  const expectedSignature = createHmac('sha256', signingKey)
    .update(payload)
    .digest('hex');

  return timingSafeCompare(signature, expectedSignature);
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare against itself to maintain constant time
    const buf = Buffer.from(a);
    timingSafeEqual(buf, buf);
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
