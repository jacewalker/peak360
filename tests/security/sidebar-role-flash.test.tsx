import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from '@/components/layout/Sidebar';

/**
 * Phase 7 — D-12 regression guard for the Sidebar role-flash bug.
 *
 * Strict positive equality (`role === 'admin'`) is the contract; any future
 * regression to `role !== 'client'` would let the loading state (role
 * undefined) leak the Admin link to non-admins. This test traps that.
 */

const mockSession = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: () => mockSession() },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/portal',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe('Sidebar role-flash — D-12 regression guard', () => {
  it('does NOT render the Admin link when session is still loading (role undefined)', () => {
    mockSession.mockReturnValue({ data: undefined });
    render(<Sidebar />);
    expect(screen.queryByText('Admin')).toBeNull();
  });

  it('does NOT render the Admin link for a client session', () => {
    mockSession.mockReturnValue({
      data: { user: { id: 'u1', role: 'client', email: 'c@x', name: 'Client' } },
    });
    render(<Sidebar />);
    expect(screen.queryByText('Admin')).toBeNull();
  });

  it('does NOT render the Admin link for a coach session', () => {
    mockSession.mockReturnValue({
      data: { user: { id: 'u2', role: 'coach', email: 'co@x', name: 'Coach' } },
    });
    render(<Sidebar />);
    expect(screen.queryByText('Admin')).toBeNull();
  });

  it('DOES render the Admin link for an admin session', () => {
    mockSession.mockReturnValue({
      data: { user: { id: 'u3', role: 'admin', email: 'a@x', name: 'Admin' } },
    });
    render(<Sidebar />);
    expect(screen.queryByText('Admin')).not.toBeNull();
  });

  it('renders Dashboard for ALL session states (including loading)', () => {
    for (const data of [
      undefined,
      { user: { id: 'u', role: 'client' } },
      { user: { id: 'u', role: 'coach' } },
      { user: { id: 'u', role: 'admin' } },
    ]) {
      mockSession.mockReturnValue({ data });
      const { unmount } = render(<Sidebar />);
      expect(screen.queryByText('Dashboard')).not.toBeNull();
      unmount();
    }
  });
});
