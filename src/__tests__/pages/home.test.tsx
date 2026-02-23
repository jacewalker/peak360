import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomePage from '@/app/page';

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('renders header and hero section', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ data: [] }),
    } as Response);

    render(<HomePage />);
    expect(screen.getByText('Complete Longevity Assessment')).toBeInTheDocument();
    expect(screen.getByText('+ New Assessment')).toBeInTheDocument();
    expect(screen.getByText('11-Section Comprehensive Evaluation')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    vi.mocked(fetch).mockReturnValueOnce(new Promise(() => {}));
    render(<HomePage />);
    expect(screen.getByText('Loading assessments...')).toBeInTheDocument();
  });

  it('shows empty state when no assessments', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ data: [] }),
    } as Response);

    render(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText('No assessments yet')).toBeInTheDocument();
    });
  });

  it('renders assessment list when assessments exist', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({
        data: [
          {
            id: 'test-1',
            clientName: 'John Smith',
            assessmentDate: '2026-02-21',
            currentSection: 5,
            status: 'in_progress',
            createdAt: '2026-02-21T10:00:00Z',
          },
        ],
      }),
    } as Response);

    render(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Previous Assessments')).toBeInTheDocument();
      expect(screen.getByText('1 total')).toBeInTheDocument();
      expect(screen.getByText('Section 5/11')).toBeInTheDocument();
    });
  });

  it('shows Unnamed Client for assessments without name', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({
        data: [
          {
            id: 'test-2',
            clientName: null,
            assessmentDate: null,
            currentSection: 1,
            status: 'in_progress',
            createdAt: '2026-02-21T10:00:00Z',
          },
        ],
      }),
    } as Response);

    render(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText('Unnamed Client')).toBeInTheDocument();
    });
  });

  it('shows completed status badge', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({
        data: [
          {
            id: 'test-3',
            clientName: 'Done Client',
            assessmentDate: '2026-02-20',
            currentSection: 11,
            status: 'completed',
            createdAt: '2026-02-20T10:00:00Z',
          },
        ],
      }),
    } as Response);

    render(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  it('calls create assessment API when button clicked', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ data: [] }),
      } as Response)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ data: { id: 'new-id' } }),
      } as Response);

    render(<HomePage />);
    await waitFor(() => {
      expect(screen.queryByText('Loading assessments...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ New Assessment'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/assessments', expect.objectContaining({
        method: 'POST',
      }));
    });
  });

  it('handles fetch error gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
    render(<HomePage />);
    await waitFor(() => {
      // Should still render without crashing
      expect(screen.getByText('No assessments yet')).toBeInTheDocument();
    });
  });
});
