import { describe, it, expect } from 'vitest';
import { createSessionToken, validateSessionToken, timingSafeCompare } from '@/lib/auth/session';

describe('Session Token', () => {
  const password = 'test-admin-password-123';

  it('creates a token with three dot-separated parts', async () => {
    const token = await createSessionToken(password);
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    // sessionId is 64 hex chars (32 bytes)
    expect(parts[0]).toMatch(/^[a-f0-9]{64}$/);
    // date is YYYY-MM-DD
    expect(parts[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // signature is 64 hex chars (sha256)
    expect(parts[2]).toMatch(/^[a-f0-9]{64}$/);
  });

  it('creates unique tokens on each call', async () => {
    const token1 = await createSessionToken(password);
    const token2 = await createSessionToken(password);
    expect(token1).not.toBe(token2);
  });

  it('validates a freshly created token', async () => {
    const token = await createSessionToken(password);
    expect(await validateSessionToken(token, password)).toBe(true);
  });

  it('rejects token with wrong password', async () => {
    const token = await createSessionToken(password);
    expect(await validateSessionToken(token, 'wrong-password')).toBe(false);
  });

  it('rejects tampered session id', async () => {
    const token = await createSessionToken(password);
    const parts = token.split('.');
    parts[0] = 'a'.repeat(64);
    expect(await validateSessionToken(parts.join('.'), password)).toBe(false);
  });

  it('rejects tampered signature', async () => {
    const token = await createSessionToken(password);
    const parts = token.split('.');
    parts[2] = 'b'.repeat(64);
    expect(await validateSessionToken(parts.join('.'), password)).toBe(false);
  });

  it('rejects malformed tokens', async () => {
    expect(await validateSessionToken('', password)).toBe(false);
    expect(await validateSessionToken('abc', password)).toBe(false);
    expect(await validateSessionToken('a.b', password)).toBe(false);
    expect(await validateSessionToken('a.b.c.d', password)).toBe(false);
  });

  it('rejects token with wrong date', async () => {
    const token = await createSessionToken(password);
    const parts = token.split('.');
    parts[1] = '2020-01-01';
    expect(await validateSessionToken(parts.join('.'), password)).toBe(false);
  });

  it('does not contain the password in any form', async () => {
    const token = await createSessionToken(password);
    expect(token).not.toContain(password);
    expect(token).not.toContain(btoa(password));
  });
});

describe('timingSafeCompare', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeCompare('hello', 'hello')).toBe(true);
    expect(timingSafeCompare('', '')).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(timingSafeCompare('hello', 'world')).toBe(false);
    expect(timingSafeCompare('hello', 'hell')).toBe(false);
    expect(timingSafeCompare('a', 'b')).toBe(false);
  });

  it('returns false for different length strings', () => {
    expect(timingSafeCompare('short', 'much longer string')).toBe(false);
    expect(timingSafeCompare('abc', 'ab')).toBe(false);
  });
});
