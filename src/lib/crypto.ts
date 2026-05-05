import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  // Support both hex (64 chars) and base64 (44 chars) encoded keys
  if (raw.length === 64) return Buffer.from(raw, 'hex');
  return Buffer.from(raw, 'base64');
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext; // Graceful degradation (D-08)

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: base64(iv + tag + ciphertext) per D-06
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  if (!key) return ciphertext; // Graceful degradation

  // Detect if data is not encrypted (backwards compat with existing data)
  if (!isEncrypted(ciphertext)) return ciphertext;

  const combined = Buffer.from(ciphertext, 'base64');
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function isEncrypted(value: string): boolean {
  // Unencrypted JSON starts with { or [; base64-encoded ciphertext won't
  if (value.startsWith('{') || value.startsWith('[')) return false;
  try {
    const buf = Buffer.from(value, 'base64');
    return buf.length >= IV_LENGTH + TAG_LENGTH + 1;
  } catch {
    return false;
  }
}
