import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FormField from '@/components/forms/FormField';
import SelectField from '@/components/forms/SelectField';
import RadioGroup from '@/components/forms/RadioGroup';
import SliderField from '@/components/forms/SliderField';
import TextareaField from '@/components/forms/TextareaField';
import FormRow from '@/components/forms/FormRow';
import Badge from '@/components/ui/Badge';
import SectionHeader from '@/components/ui/SectionHeader';
import WarningBox from '@/components/ui/WarningBox';
import TestCategory from '@/components/ui/TestCategory';

describe('FormField', () => {
  it('renders label and input', () => {
    render(<FormField id="test" label="Test Label" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  it('shows required asterisk', () => {
    render(<FormField id="test" label="Test" value="" onChange={() => {}} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('calls onChange with new value', () => {
    const onChange = vi.fn();
    render(<FormField id="test" label="Test" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Test'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('renders with correct type', () => {
    render(<FormField id="test" label="Test" type="email" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Test')).toHaveAttribute('type', 'email');
  });

  it('handles disabled state', () => {
    render(<FormField id="test" label="Test" value="val" onChange={() => {}} disabled />);
    expect(screen.getByLabelText('Test')).toBeDisabled();
  });

  it('renders number fields with min/max/step', () => {
    render(<FormField id="test" label="Test" type="number" value={5} onChange={() => {}} min={0} max={10} step={0.5} />);
    const input = screen.getByLabelText('Test');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '10');
    expect(input).toHaveAttribute('step', '0.5');
  });
});

describe('SelectField', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];

  it('renders label and select', () => {
    render(<SelectField id="test" label="Test Select" value="" onChange={() => {}} options={options} />);
    expect(screen.getByLabelText('Test Select')).toBeInTheDocument();
  });

  it('renders all options plus default', () => {
    render(<SelectField id="test" label="Test" value="" onChange={() => {}} options={options} />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn();
    render(<SelectField id="test" label="Test" value="" onChange={onChange} options={options} />);
    fireEvent.change(screen.getByLabelText('Test'), { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('RadioGroup', () => {
  const options = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ];

  it('renders label and options', () => {
    render(<RadioGroup name="test" label="Test Question" value="" onChange={() => {}} options={options} />);
    expect(screen.getByText('Test Question')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('checks the correct radio based on value', () => {
    render(<RadioGroup name="test" label="Test" value="yes" onChange={() => {}} options={options} />);
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toBeChecked();
    expect(radios[1]).not.toBeChecked();
  });

  it('calls onChange when radio clicked', () => {
    const onChange = vi.fn();
    render(<RadioGroup name="test" label="Test" value="" onChange={onChange} options={options} />);
    fireEvent.click(screen.getByText('No'));
    expect(onChange).toHaveBeenCalledWith('no');
  });
});

describe('SliderField', () => {
  it('renders label and current value', () => {
    render(<SliderField id="test" label="Test Slider" value={7} onChange={() => {}} />);
    expect(screen.getByText('Test Slider')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('shows min and max labels', () => {
    render(<SliderField id="test" label="Test" value={5} onChange={() => {}} min={1} max={10} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('calls onChange with number value', () => {
    const onChange = vi.fn();
    render(<SliderField id="test" label="Test" value={5} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '8' } });
    expect(onChange).toHaveBeenCalledWith(8);
  });
});

describe('TextareaField', () => {
  it('renders label and textarea', () => {
    render(<TextareaField id="test" label="Test Textarea" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Test Textarea')).toBeInTheDocument();
  });

  it('calls onChange with new value', () => {
    const onChange = vi.fn();
    render(<TextareaField id="test" label="Test" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Test'), { target: { value: 'text content' } });
    expect(onChange).toHaveBeenCalledWith('text content');
  });
});

describe('FormRow', () => {
  it('renders children in a grid', () => {
    const { container } = render(
      <FormRow>
        <div>Child 1</div>
        <div>Child 2</div>
      </FormRow>
    );
    expect(container.querySelector('.grid')).toBeInTheDocument();
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });
});

describe('Badge', () => {
  it('renders tier label', () => {
    render(<Badge tier="elite" />);
    expect(screen.getByText('Elite')).toBeInTheDocument();
  });

  it('renders all tier types', () => {
    const tiers = ['poor', 'cautious', 'normal', 'great', 'elite'] as const;
    const labels = ['Poor', 'Cautious', 'Normal', 'Great', 'Elite'];
    tiers.forEach((tier, i) => {
      const { unmount } = render(<Badge tier={tier} />);
      expect(screen.getByText(labels[i])).toBeInTheDocument();
      unmount();
    });
  });
});

describe('SectionHeader', () => {
  it('renders section number and title', () => {
    render(<SectionHeader number={3} title="Medical Screening" />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Medical Screening')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<SectionHeader number={1} title="Test" description="A description" />);
    expect(screen.getByText('A description')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<SectionHeader number={1} title="Test" />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });
});

describe('WarningBox', () => {
  it('renders title and content', () => {
    render(<WarningBox title="Warning!"><p>Something is wrong</p></WarningBox>);
    expect(screen.getByText('Warning!')).toBeInTheDocument();
    expect(screen.getByText('Something is wrong')).toBeInTheDocument();
  });
});

describe('TestCategory', () => {
  it('renders title and children', () => {
    render(<TestCategory title="Lipid Panel"><div>Fields here</div></TestCategory>);
    expect(screen.getByText('Lipid Panel')).toBeInTheDocument();
    expect(screen.getByText('Fields here')).toBeInTheDocument();
  });
});
