import { describe, it, expect } from 'vitest';
import { generatePeak360Insights } from '@/lib/normative/insights';

describe('generatePeak360Insights', () => {
  it('returns empty array when no markers provided', () => {
    const insights = generatePeak360Insights({ markers: [] });
    expect(insights).toEqual([]);
  });

  it('returns empty array when all markers are normal', () => {
    const insights = generatePeak360Insights({
      age: 30,
      gender: 'male',
      markers: [
        { testKey: 'cholesterol_total', label: 'Total Cholesterol', value: 4.5 },
        { testKey: 'fasting_glucose', label: 'Fasting Glucose', value: 4.8 },
        { testKey: 'resting_hr', label: 'Resting HR', value: 65 },
      ],
    });
    // All normal values should not generate insights (score >= 3)
    expect(insights.length).toBe(0);
  });

  it('generates cardio-metabolic insight for high cholesterol', () => {
    const insights = generatePeak360Insights({
      age: 40,
      gender: 'male',
      markers: [
        { testKey: 'cholesterol_total', label: 'Total Cholesterol', value: 7.0 },
      ],
    });
    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0].title).toBe('Cardio-metabolic risk flags');
    expect(insights[0].doNow.length).toBeGreaterThan(0);
  });

  it('generates glucose regulation insight for high HbA1c', () => {
    const insights = generatePeak360Insights({
      markers: [
        { testKey: 'hba1c', label: 'HbA1c', value: 7.0 },
      ],
    });
    const glucoseInsight = insights.find(i => i.title === 'Glucose regulation needs work');
    expect(glucoseInsight).toBeDefined();
  });

  it('generates inflammation insight for high hs-CRP', () => {
    const insights = generatePeak360Insights({
      markers: [
        { testKey: 'crp_hs', label: 'hs-CRP', value: 10 },
      ],
    });
    const inflammationInsight = insights.find(i => i.title === 'Inflammation / vascular stress elevated');
    expect(inflammationInsight).toBeDefined();
  });

  it('deduplicates insights with the same title', () => {
    const insights = generatePeak360Insights({
      markers: [
        { testKey: 'cholesterol_total', label: 'Total Cholesterol', value: 7.0 },
        { testKey: 'ldl_cholesterol', label: 'LDL Cholesterol', value: 5.0 },
        { testKey: 'triglycerides', label: 'Triglycerides', value: 4.0 },
      ],
    });
    const cardioInsights = insights.filter(i => i.title === 'Cardio-metabolic risk flags');
    expect(cardioInsights.length).toBe(1);
  });

  it('handles null marker values gracefully', () => {
    const insights = generatePeak360Insights({
      markers: [
        { testKey: 'cholesterol_total', label: 'Total Cholesterol', value: null },
      ],
    });
    expect(insights).toEqual([]);
  });

  it('generates vitamin D insight', () => {
    const insights = generatePeak360Insights({
      markers: [
        { testKey: 'vitamin_d_25oh', label: 'Vitamin D', value: 15 },
      ],
    });
    const vitDInsight = insights.find(i => i.title === 'Vitamin D low');
    expect(vitDInsight).toBeDefined();
  });

  it('generates protective cholesterol insight for low HDL', () => {
    const insights = generatePeak360Insights({
      markers: [
        { testKey: 'hdl_cholesterol', label: 'HDL Cholesterol', value: 0.7 },
      ],
    });
    const hdlInsight = insights.find(i => i.title === 'Protective cholesterol low');
    expect(hdlInsight).toBeDefined();
  });
});
