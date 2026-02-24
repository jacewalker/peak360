import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '@/components/layout/Header';
import ProgressBar from '@/components/layout/ProgressBar';
import NavigationButtons from '@/components/layout/NavigationButtons';

describe('Header', () => {
  it('renders the logo and brand name', () => {
    render(<Header />);
    expect(screen.getByText('PEAK')).toBeInTheDocument();
    expect(screen.getByText('360')).toBeInTheDocument();
    expect(screen.getByText('Longevity Assessment')).toBeInTheDocument();
  });

  it('renders the logo image', () => {
    render(<Header />);
    expect(screen.getByAlt('Peak360 Logo')).toBeInTheDocument();
  });

  it('has a link to homepage', () => {
    render(<Header />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/');
  });
});

describe('ProgressBar', () => {
  it('shows current section number', () => {
    render(<ProgressBar assessmentId="test-id" currentSection={3} />);
    expect(screen.getByText('Section 3 of 11')).toBeInTheDocument();
  });

  it('shows section title', () => {
    render(<ProgressBar assessmentId="test-id" currentSection={1} />);
    expect(screen.getByText('Client Information')).toBeInTheDocument();
  });

  it('renders all 11 step indicators', () => {
    render(<ProgressBar assessmentId="test-id" currentSection={5} />);
    for (let i = 1; i <= 11; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it('shows correct title for each section', () => {
    render(<ProgressBar assessmentId="test-id" currentSection={7} />);
    expect(screen.getByText('Section 7 of 11')).toBeInTheDocument();
    expect(screen.getByText('Cardiovascular Fitness')).toBeInTheDocument();
  });
});

describe('NavigationButtons', () => {
  it('renders Previous and Next buttons', () => {
    render(
      <NavigationButtons
        currentSection={3}
        onPrev={() => {}}
        onNext={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('disables Previous on section 1', () => {
    render(
      <NavigationButtons
        currentSection={1}
        onPrev={() => {}}
        onNext={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('enables Previous on sections > 1', () => {
    render(
      <NavigationButtons
        currentSection={5}
        onPrev={() => {}}
        onNext={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
  });

  it('shows Complete on last section', () => {
    render(
      <NavigationButtons
        currentSection={11}
        onPrev={() => {}}
        onNext={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
  });

  it('shows saving indicator when isSaving is true', () => {
    render(
      <NavigationButtons
        currentSection={3}
        onPrev={() => {}}
        onNext={() => {}}
        isSaving={true}
      />
    );
    // The saving spinner should be present (animate-spin class)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows last saved time', () => {
    render(
      <NavigationButtons
        currentSection={3}
        onPrev={() => {}}
        onNext={() => {}}
        lastSaved="10:30:00 AM"
      />
    );
    expect(screen.getByText('Saved at 10:30:00 AM')).toBeInTheDocument();
  });
});
