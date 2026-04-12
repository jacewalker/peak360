import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('crypto module', () => {
  const TEST_KEY = 'a'.repeat(64); // 64 hex chars = 32 bytes

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  it('encrypt produces a base64 string that is NOT equal to plaintext', async () => {
    const { encrypt } = await import('@/lib/crypto');
    const plaintext = '{"cholesterolTotal": 200}';
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    // Should be valid base64
    expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
  });

  it('decrypt(encrypt(plaintext)) returns the original plaintext exactly', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto');
    const plaintext = '{"cholesterolTotal": 200, "ldl": 120}';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('two encrypt calls on the same plaintext produce different ciphertexts (random IV)', async () => {
    const { encrypt } = await import('@/lib/crypto');
    const plaintext = 'test data';
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);
    expect(enc1).not.toBe(enc2);
  });

  it('isEncrypted returns false for JSON string', async () => {
    const { isEncrypted } = await import('@/lib/crypto');
    expect(isEncrypted('{"key":"value"}')).toBe(false);
  });

  it('isEncrypted returns true for encrypted data', async () => {
    const { encrypt, isEncrypted } = await import('@/lib/crypto');
    const encrypted = encrypt('test');
    expect(isEncrypted(encrypted)).toBe(true);
  });

  it('decrypt returns original string unchanged for unencrypted JSON (backwards compat)', async () => {
    const { decrypt } = await import('@/lib/crypto');
    const json = '{"key":"value"}';
    expect(decrypt(json)).toBe(json);
  });

  it('encrypt returns plaintext unchanged when ENCRYPTION_KEY is unset', async () => {
    delete process.env.ENCRYPTION_KEY;
    // Need fresh import to pick up env change
    const mod = await import('@/lib/crypto');
    const plaintext = 'sensitive data';
    expect(mod.encrypt(plaintext)).toBe(plaintext);
  });

  it('decrypt returns ciphertext unchanged when ENCRYPTION_KEY is unset', async () => {
    delete process.env.ENCRYPTION_KEY;
    const mod = await import('@/lib/crypto');
    const ciphertext = 'some-base64-looking-string';
    expect(mod.decrypt(ciphertext)).toBe(ciphertext);
  });
});
