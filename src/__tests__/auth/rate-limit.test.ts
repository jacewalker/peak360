import { describe, it, expect, beforeEach, vi } from 'vitest';

// Re-import fresh module for each test
let checkRateLimit: typeof import('@/lib/auth/rate-limit').checkRateLimit;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('@/lib/auth/rate-limit');
  checkRateLimit = mod.checkRateLimit;
});

describe('Rate Limiter', () => {
  it('allows first request', () => {
    const result = checkRateLimit('192.168.1.1');
    expect(result.limited).toBe(false);
  });

  it('allows up to 5 requests from same IP', () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit('192.168.1.2');
      expect(result.limited).toBe(false);
    }
  });

  it('blocks 6th request from same IP', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('192.168.1.3');
    }
    const result = checkRateLimit('192.168.1.3');
    expect(result.limited).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks IPs independently', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('10.0.0.1');
    }
    // 10.0.0.1 is now blocked
    expect(checkRateLimit('10.0.0.1').limited).toBe(true);
    // 10.0.0.2 should still be allowed
    expect(checkRateLimit('10.0.0.2').limited).toBe(false);
  });

  it('returns retry-after seconds when limited', () => {
    for (let i = 0; i < 6; i++) {
      checkRateLimit('10.0.0.3');
    }
    const result = checkRateLimit('10.0.0.3');
    expect(result.limited).toBe(true);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(15 * 60);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});
