import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CustomMarkersBlock from '@/components/forms/CustomMarkersBlock';

type FetchedMarker = {
  testKey: string;
  label: string;
  section: number;
  dataKey: string;
  fallbackUnit?: string | null;
  source: 'seed' | 'db';
};

function mockFetchSuccess(markers: FetchedMarker[]) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true, data: { markers } }),
  } as Response);
}

function mockFetchReject() {
  (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'));
}

describe('CustomMarkersBlock', () => {
  beforeEach(() => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  it('renders only DB markers matching the section prop', async () => {
    mockFetchSuccess([
      { testKey: 'customMarker', label: 'Custom Marker', section: 5, dataKey: 'customMarker', fallbackUnit: 'mg/L', source: 'db' },
      { testKey: 'otherSection', label: 'Other Section', section: 6, dataKey: 'otherSection', fallbackUnit: null, source: 'db' },
      { testKey: 'seededMarker', label: 'Seeded Marker', section: 5, dataKey: 'seededMarker', fallbackUnit: 'mmol/L', source: 'seed' },
    ]);
    render(<CustomMarkersBlock section={5} data={{}} onChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Custom Marker \(mg\/L\)/)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/Other Section/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Seeded Marker/)).not.toBeInTheDocument();
  });

  it('renders nothing when the merged list contains no matching DB markers', async () => {
    mockFetchSuccess([]);
    const { container } = render(<CustomMarkersBlock section={5} data={{}} onChange={() => {}} />);
    // wait for the (no-op) state update; verify nothing rendered
    await waitFor(() => {
      expect((global.fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the fetch rejects (self-hide on network failure)', async () => {
    mockFetchReject();
    const { container } = render(<CustomMarkersBlock section={5} data={{}} onChange={() => {}} />);
    await waitFor(() => {
      expect((global.fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });
    expect(container.firstChild).toBeNull();
  });

  it('writes back through onChange when a numeric value is entered', async () => {
    mockFetchSuccess([
      { testKey: 'customMarker', label: 'Custom Marker', section: 5, dataKey: 'customMarker', fallbackUnit: 'mg/L', source: 'db' },
    ]);
    const onChange = vi.fn();
    // seed with an existing value so the "clear to empty" branch can fire as a real change
    render(<CustomMarkersBlock section={5} data={{ customMarker: 10 }} onChange={onChange} />);
    const input = await screen.findByLabelText(/Custom Marker \(mg\/L\)/);
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(input, { target: { value: '42.5' } });
    expect(onChange).toHaveBeenCalledWith('customMarker', 42.5);

    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith('customMarker', null);
  });
});
