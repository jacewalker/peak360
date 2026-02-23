import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Section1 from '@/components/sections/Section1';
import Section2 from '@/components/sections/Section2';
import Section3 from '@/components/sections/Section3';
import Section4 from '@/components/sections/Section4';
import Section5 from '@/components/sections/Section5';
import Section6 from '@/components/sections/Section6';
import Section7 from '@/components/sections/Section7';
import Section8 from '@/components/sections/Section8';
import Section9 from '@/components/sections/Section9';
import Section10 from '@/components/sections/Section10';

describe('Section1 - Client Information', () => {
  const defaultProps = {
    data: {} as Record<string, unknown>,
    onChange: vi.fn(),
    assessmentId: 'test-id',
  };

  it('renders section header', () => {
    render(<Section1 {...defaultProps} />);
    expect(screen.getByText('Client Information')).toBeInTheDocument();
  });

  it('renders all client info fields', () => {
    render(<Section1 {...defaultProps} />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^phone$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^gender/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/age \(calculated\)/i)).toBeInTheDocument();
  });

  it('renders emergency contact section', () => {
    render(<Section1 {...defaultProps} />);
    expect(screen.getByText('Emergency Contact')).toBeInTheDocument();
    expect(screen.getByLabelText(/emergency contact name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/relationship/i)).toBeInTheDocument();
  });

  it('calls onChange when typing in name field', () => {
    const onChange = vi.fn();
    render(<Section1 {...defaultProps} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Smith' } });
    expect(onChange).toHaveBeenCalledWith('clientName', 'John Smith');
  });

  it('displays existing data', () => {
    render(<Section1 {...defaultProps} data={{ clientName: 'Jane Doe', clientEmail: 'jane@test.com' }} />);
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Jane Doe');
    expect(screen.getByLabelText(/email/i)).toHaveValue('jane@test.com');
  });

  it('auto-calculates age from DOB', () => {
    const onChange = vi.fn();
    render(<Section1 {...defaultProps} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } });
    // Should call onChange for both DOB and age
    expect(onChange).toHaveBeenCalledWith('clientDOB', '1990-01-01');
    expect(onChange).toHaveBeenCalledWith('clientAge', expect.any(Number));
  });
});

describe('Section2 - Daily Readiness', () => {
  const defaultProps = {
    data: {} as Record<string, unknown>,
    onChange: vi.fn(),
    assessmentId: 'test-id',
  };

  it('renders section header', () => {
    render(<Section2 {...defaultProps} />);
    expect(screen.getByText('Daily Readiness Assessment')).toBeInTheDocument();
  });

  it('renders sleep, stress, energy, and soreness fields', () => {
    render(<Section2 {...defaultProps} />);
    expect(screen.getByLabelText(/hours of sleep/i)).toBeInTheDocument();
    expect(screen.getByText('Stress Level')).toBeInTheDocument();
    expect(screen.getByText('Energy Level')).toBeInTheDocument();
    expect(screen.getByText('Muscle Soreness')).toBeInTheDocument();
  });

  it('renders caffeine and alcohol select fields', () => {
    render(<Section2 {...defaultProps} />);
    expect(screen.getByLabelText(/caffeine/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/alcohol/i)).toBeInTheDocument();
  });
});

describe('Section3 - Medical Screening', () => {
  const defaultProps = {
    data: {} as Record<string, unknown>,
    onChange: vi.fn(),
    assessmentId: 'test-id',
  };

  it('renders section header', () => {
    render(<Section3 {...defaultProps} />);
    expect(screen.getByText('Medical Screening & Safety Check')).toBeInTheDocument();
  });

  it('renders all screening questions', () => {
    render(<Section3 {...defaultProps} />);
    expect(screen.getByText(/chest pain/i)).toBeInTheDocument();
    expect(screen.getByText(/dizziness/i)).toBeInTheDocument();
    expect(screen.getByText(/heart condition/i)).toBeInTheDocument();
    expect(screen.getByText(/blood pressure/i)).toBeInTheDocument();
  });

  it('shows warning when chest pain is yes', () => {
    render(<Section3 {...defaultProps} data={{ chestPain: 'yes' }} />);
    expect(screen.getByText('Medical Flag Detected')).toBeInTheDocument();
  });

  it('does not show warning when all answers are no', () => {
    render(<Section3 {...defaultProps} data={{ chestPain: 'no', dizziness: 'no', heartCondition: 'no', uncontrolledBP: 'no' }} />);
    expect(screen.queryByText('Medical Flag Detected')).not.toBeInTheDocument();
  });

  it('shows surgery details textarea when surgery is yes', () => {
    render(<Section3 {...defaultProps} data={{ recentSurgery: 'yes' }} />);
    expect(screen.getByLabelText(/surgery\/injury details/i)).toBeInTheDocument();
  });

  it('hides surgery details textarea when surgery is no', () => {
    render(<Section3 {...defaultProps} data={{ recentSurgery: 'no' }} />);
    expect(screen.queryByLabelText(/surgery\/injury details/i)).not.toBeInTheDocument();
  });

  it('renders additional medical info textareas', () => {
    render(<Section3 {...defaultProps} />);
    expect(screen.getByLabelText(/current medications/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/diagnosed conditions/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/other concerns/i)).toBeInTheDocument();
  });
});

describe('Section4 - Informed Consent', () => {
  const defaultProps = {
    data: {} as Record<string, unknown>,
    onChange: vi.fn(),
    assessmentId: 'test-id',
  };

  it('renders section header', () => {
    render(<Section4 {...defaultProps} />);
    expect(screen.getByText('Informed Consent & Agreement')).toBeInTheDocument();
  });

  it('renders consent agreement text', () => {
    render(<Section4 {...defaultProps} />);
    expect(screen.getByText('Consent Agreement')).toBeInTheDocument();
    expect(screen.getByText('Privacy Notice (HIPAA Compliant)')).toBeInTheDocument();
  });

  it('renders consent checkbox', () => {
    render(<Section4 {...defaultProps} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('renders client signature section', () => {
    render(<Section4 {...defaultProps} />);
    expect(screen.getByText('Client Signature')).toBeInTheDocument();
  });

  it('renders coach signature section', () => {
    render(<Section4 {...defaultProps} />);
    expect(screen.getByText('Coach / Administrator Signature')).toBeInTheDocument();
  });

  it('calls onChange when consent checkbox clicked', () => {
    const onChange = vi.fn();
    render(<Section4 {...defaultProps} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith('consentAgree', true);
  });
});

describe('Section5 - Blood Tests & Biomarkers', () => {
  const defaultProps = {
    data: {} as Record<string, unknown>,
    onChange: vi.fn(),
    assessmentId: 'test-id',
  };

  it('renders section header', () => {
    render(<Section5 {...defaultProps} />);
    expect(screen.getByText('Blood Tests & Biomarkers')).toBeInTheDocument();
  });

  it('renders file upload zone', () => {
    render(<Section5 {...defaultProps} />);
    expect(screen.getByText('Import Lab Results')).toBeInTheDocument();
    expect(screen.getByText(/drop file here/i)).toBeInTheDocument();
  });

  it('renders all test categories', () => {
    render(<Section5 {...defaultProps} />);
    expect(screen.getByText('Lipid Panel')).toBeInTheDocument();
    expect(screen.getByText('Glucose / Metabolic')).toBeInTheDocument();
    expect(screen.getByText('Inflammation')).toBeInTheDocument();
    expect(screen.getByText('Thyroid')).toBeInTheDocument();
    expect(screen.getByText('Hormones')).toBeInTheDocument();
    expect(screen.getByText('Vitamins & Minerals')).toBeInTheDocument();
    expect(screen.getByText('Iron Studies')).toBeInTheDocument();
    expect(screen.getByText('Full Blood Count (FBC)')).toBeInTheDocument();
    expect(screen.getByText('Kidney Function & Electrolytes')).toBeInTheDocument();
    expect(screen.getByText('Liver Function Tests')).toBeInTheDocument();
    expect(screen.getByText('Advanced Lipids')).toBeInTheDocument();
    expect(screen.getByText('Heavy Metals Screen')).toBeInTheDocument();
  });

  it('renders lipid panel fields', () => {
    render(<Section5 {...defaultProps} />);
    expect(screen.getByLabelText(/total cholesterol/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ldl cholesterol/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hdl cholesterol/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/triglycerides/i)).toBeInTheDocument();
  });

  it('displays existing blood test data', () => {
    render(<Section5 {...defaultProps} data={{ cholesterolTotal: 5.5, ldl: 3.2 }} />);
    expect(screen.getByLabelText(/total cholesterol/i)).toHaveValue(5.5);
    expect(screen.getByLabelText(/ldl cholesterol/i)).toHaveValue(3.2);
  });
});

describe('Section6 - Body Composition', () => {
  const defaultProps = {
    data: {} as Record<string, unknown>,
    onChange: vi.fn(),
    assessmentId: 'test-id',
  };

  it('renders section header', () => {
    render(<Section6 {...defaultProps} />);
    expect(screen.getByText('Body Composition')).toBeInTheDocument();
  });

  it('renders file upload zone for Evolt', () => {
    render(<Section6 {...defaultProps} />);
    expect(screen.getByText('Import Evolt 360 Scan Data')).toBeInTheDocument();
  });

  it('renders body composition fields', () => {
    render(<Section6 {...defaultProps} />);
    expect(screen.getByLabelText(/body fat percentage/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/lean mass/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/skeletal muscle mass/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/waist-to-hip ratio/i)).toBeInTheDocument();
  });
});

describe('Section7 - Cardiovascular Fitness', () => {
  const defaultProps = {
    data: {} as Record<string, unknown>,
    onChange: vi.fn(),
    assessmentId: 'test-id',
  };

  it('renders section header', () => {
    render(<Section7 {...defaultProps} />);
    expect(screen.getByText('Cardiovascular Fitness Testing')).toBeInTheDocument();
  });

  it('renders cardio test radio options', () => {
    render(<Section7 {...defaultProps} />);
    expect(screen.getByText('VO2 Max Test')).toBeInTheDocument();
    expect(screen.getByText('6-Minute Walk Test')).toBeInTheDocument();
  });

  it('shows VO2 max field when vo2max selected', () => {
    render(<Section7 {...defaultProps} data={{ cardioTest: 'vo2max' }} />);
    expect(screen.getByLabelText(/vo2 max/i)).toBeInTheDocument();
  });

  it('shows 6-min walk field when sixminwalk selected', () => {
    render(<Section7 {...defaultProps} data={{ cardioTest: 'sixminwalk' }} />);
    expect(screen.getByLabelText(/6-minute walk/i)).toBeInTheDocument();
  });

  it('hides conditional fields when no test selected', () => {
    render(<Section7 {...defaultProps} />);
    expect(screen.queryByLabelText(/vo2 max \(ml/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/6-minute walk/i)).not.toBeInTheDocument();
  });

  it('renders vitals fields', () => {
    render(<Section7 {...defaultProps} />);
    expect(screen.getByLabelText(/resting heart rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/systolic/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/diastolic/i)).toBeInTheDocument();
  });
});

describe('Section8 - Strength Testing', () => {
  const defaultProps = {
    data: {} as Record<string, unknown>,
    onChange: vi.fn(),
    assessmentId: 'test-id',
  };

  it('renders section header', () => {
    render(<Section8 {...defaultProps} />);
    expect(screen.getByText('Strength Testing')).toBeInTheDocument();
  });

  it('renders all strength test fields', () => {
    render(<Section8 {...defaultProps} />);
    expect(screen.getByLabelText(/grip strength - left/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/grip strength - right/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/push-up test/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dead man hang/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sit-to-stand/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/farmers carry - weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/farmers carry - distance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/med ball chest pass/i)).toBeInTheDocument();
  });
});

describe('Section9 - Mobility & Flexibility', () => {
  const defaultProps = {
    data: {} as Record<string, unknown>,
    onChange: vi.fn(),
    assessmentId: 'test-id',
  };

  it('renders section header', () => {
    render(<Section9 {...defaultProps} />);
    expect(screen.getByText('Mobility & Flexibility Testing')).toBeInTheDocument();
  });

  it('renders bilateral measurement fields', () => {
    render(<Section9 {...defaultProps} />);
    expect(screen.getByLabelText(/overhead reach - left/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/overhead reach - right/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/shoulder mobility - left/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/shoulder mobility - right/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hip flexion.*left/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hip flexion.*right/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ankle dorsiflexion.*left/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ankle dorsiflexion.*right/i)).toBeInTheDocument();
  });
});

describe('Section10 - Balance & Power', () => {
  const defaultProps = {
    data: {} as Record<string, unknown>,
    onChange: vi.fn(),
    assessmentId: 'test-id',
  };

  it('renders section header', () => {
    render(<Section10 {...defaultProps} />);
    expect(screen.getByText('Balance & Power Testing')).toBeInTheDocument();
  });

  it('renders balance and power fields', () => {
    render(<Section10 {...defaultProps} />);
    expect(screen.getByLabelText(/single leg balance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/standing broad jump/i)).toBeInTheDocument();
  });
});
