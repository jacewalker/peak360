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

  // === NEW TESTS: Supplement dosages and healthcare provider language ===

  describe('healthcare provider consultation language (D-05)', () => {
    it('every insight why field contains healthcare provider consultation language', () => {
      const insights = generatePeak360Insights({
        age: 40,
        gender: 'male',
        markers: [
          { testKey: 'vitamin_d_25oh', label: 'Vitamin D', value: 15 },
          { testKey: 'cholesterol_total', label: 'Total Cholesterol', value: 7.0 },
          { testKey: 'hba1c', label: 'HbA1c', value: 7.0 },
          { testKey: 'crp_hs', label: 'hs-CRP', value: 10 },
          { testKey: 'ferritin', label: 'Ferritin', value: 5 },
          { testKey: 'tsh', label: 'TSH', value: 0.1 },
          { testKey: 'totalTestosterone', label: 'Total Testosterone', value: 3 },
          { testKey: 'alt', label: 'ALT', value: 100 },
          { testKey: 'creatinine', label: 'Creatinine', value: 200 },
          { testKey: 'hdl_cholesterol', label: 'HDL Cholesterol', value: 0.7 },
        ],
      });
      expect(insights.length).toBeGreaterThan(0);
      for (const insight of insights) {
        const hasProviderLanguage =
          insight.doNow.some(d =>
            d.toLowerCase().includes('healthcare provider') ||
            d.toLowerCase().includes('clinician') ||
            d.toLowerCase().includes('discuss with')
          );
        expect(hasProviderLanguage).toBe(true);
      }
    });
  });

  describe('specific supplement recommendations (D-03)', () => {
    it('Vitamin D poor tier mentions Vitamin D3 supplementation and dosage', () => {
      const insights = generatePeak360Insights({
        age: 40,
        gender: 'male',
        markers: [{ testKey: 'vitamin_d_25oh', label: 'Vitamin D', value: 15 }],
      });
      const vitD = insights.find(i => i.title === 'Vitamin D low');
      expect(vitD).toBeDefined();
      const allDoNow = vitD!.doNow.join(' ');
      expect(allDoNow).toContain('Vitamin D3 supplementation');
      expect(allDoNow).toMatch(/2000.*4000.*IU\/day/);
    });

    it('ferritin poor tier mentions iron bisglycinate and dietary sources', () => {
      const insights = generatePeak360Insights({
        age: 40,
        gender: 'male',
        markers: [{ testKey: 'ferritin', label: 'Ferritin', value: 5 }],
      });
      const ferritinInsight = insights.find(i => i.title.toLowerCase().includes('ferritin'));
      expect(ferritinInsight).toBeDefined();
      const allDoNow = ferritinInsight!.doNow.join(' ');
      expect(allDoNow.toLowerCase()).toContain('iron bisglycinate');
    });

    it('LDL/lipid insights mention omega-3 supplementation', () => {
      const insights = generatePeak360Insights({
        markers: [{ testKey: 'ldl', label: 'LDL', value: 5.0 }],
      });
      const lipid = insights.find(i => i.title === 'Cardio-metabolic risk flags');
      expect(lipid).toBeDefined();
      const allDoNow = lipid!.doNow.join(' ');
      expect(allDoNow.toLowerCase()).toContain('omega-3');
    });

    it('glucose markers mention berberine or magnesium', () => {
      const insights = generatePeak360Insights({
        markers: [{ testKey: 'glucose', label: 'Glucose', value: 8.0 }],
      });
      const glucose = insights.find(i => i.title === 'Glucose regulation needs work');
      expect(glucose).toBeDefined();
      const allDoNow = glucose!.doNow.join(' ');
      expect(
        allDoNow.toLowerCase().includes('berberine') ||
        allDoNow.toLowerCase().includes('magnesium')
      ).toBe(true);
    });

    it('homocysteine insight mentions methylated B vitamins', () => {
      const insights = generatePeak360Insights({
        markers: [{ testKey: 'homocysteine', label: 'Homocysteine', value: 20 }],
      });
      const homo = insights.find(i => i.title === 'Inflammation / vascular stress elevated');
      expect(homo).toBeDefined();
      const allDoNow = homo!.doNow.join(' ');
      expect(allDoNow.toLowerCase()).toContain('methylfolate');
    });

    it('HDL insight mentions niacin', () => {
      const insights = generatePeak360Insights({
        markers: [{ testKey: 'hdl_cholesterol', label: 'HDL Cholesterol', value: 0.7 }],
      });
      const hdl = insights.find(i => i.title === 'Protective cholesterol low');
      expect(hdl).toBeDefined();
      const allDoNow = hdl!.doNow.join(' ');
      expect(allDoNow.toLowerCase()).toContain('niacin');
    });

    it('liver markers mention milk thistle and NAC', () => {
      const insights = generatePeak360Insights({
        markers: [{ testKey: 'alt', label: 'ALT', value: 100 }],
      });
      const liver = insights.find(i => i.title === 'Liver markers flagged');
      expect(liver).toBeDefined();
      const allDoNow = liver!.doNow.join(' ');
      expect(allDoNow.toLowerCase()).toContain('milk thistle');
      expect(allDoNow.toLowerCase()).toContain('nac');
    });

    it('thyroid markers mention selenium and recommend clinician review, not self-supplementation', () => {
      const insights = generatePeak360Insights({
        markers: [{ testKey: 'tsh', label: 'TSH', value: 0.1 }],
      });
      const thyroid = insights.find(i => i.title === 'Thyroid markers flagged');
      expect(thyroid).toBeDefined();
      const allDoNow = thyroid!.doNow.join(' ');
      expect(allDoNow.toLowerCase()).toContain('selenium');
      expect(allDoNow.toLowerCase()).toContain('clinician');
    });

    it('sex hormone markers mention zinc and magnesium but emphasize clinician guidance', () => {
      const insights = generatePeak360Insights({
        age: 40,
        gender: 'male',
        markers: [{ testKey: 'totalTestosterone', label: 'Total Testosterone', value: 3 }],
      });
      const hormone = insights.find(i => i.title === 'Sex hormone markers flagged');
      expect(hormone).toBeDefined();
      const allDoNow = hormone!.doNow.join(' ');
      expect(allDoNow.toLowerCase()).toContain('zinc');
      expect(allDoNow.toLowerCase()).toContain('magnesium');
      expect(allDoNow.toLowerCase()).toContain('clinician');
    });

    it('kidney markers recommend hydration but not self-supplementation', () => {
      const insights = generatePeak360Insights({
        markers: [{ testKey: 'creatinine', label: 'Creatinine', value: 200 }],
      });
      const kidney = insights.find(i => i.title === 'Kidney markers flagged');
      expect(kidney).toBeDefined();
      const allDoNow = kidney!.doNow.join(' ');
      expect(allDoNow.toLowerCase()).toContain('hydration');
      expect(allDoNow.toLowerCase()).toContain('clinician');
    });
  });

  describe('dietary/lifestyle suggestions for cautious tier (D-04)', () => {
    it('lipid markers include soluble fibre dietary suggestions', () => {
      const insights = generatePeak360Insights({
        markers: [{ testKey: 'cholesterol_total', label: 'Total Cholesterol', value: 7.0 }],
      });
      const lipid = insights.find(i => i.title === 'Cardio-metabolic risk flags');
      expect(lipid).toBeDefined();
      const allDoNow = lipid!.doNow.join(' ');
      expect(allDoNow.toLowerCase()).toContain('fibre');
    });

    it('glucose markers include walk after meals suggestion', () => {
      const insights = generatePeak360Insights({
        markers: [{ testKey: 'glucose', label: 'Glucose', value: 8.0 }],
      });
      const glucose = insights.find(i => i.title === 'Glucose regulation needs work');
      expect(glucose).toBeDefined();
      const allDoNow = glucose!.doNow.join(' ');
      expect(allDoNow.toLowerCase()).toContain('walk');
    });

    it('vitamin D insight includes sun exposure suggestion', () => {
      const insights = generatePeak360Insights({
        markers: [{ testKey: 'vitamin_d_25oh', label: 'Vitamin D', value: 15 }],
      });
      const vitD = insights.find(i => i.title === 'Vitamin D low');
      expect(vitD).toBeDefined();
      const allDoNow = vitD!.doNow.join(' ');
      expect(allDoNow.toLowerCase()).toContain('sun exposure');
    });
  });

  describe('de-duplication of related but distinct markers', () => {
    it('hemoglobin poor and ferritin poor produce two distinct insights', () => {
      const insights = generatePeak360Insights({
        age: 40,
        gender: 'male',
        markers: [
          { testKey: 'hemoglobin', label: 'Hemoglobin', value: 80 },
          { testKey: 'ferritin', label: 'Ferritin', value: 5 },
        ],
      });
      const hemoInsight = insights.find(i => i.title.toLowerCase().includes('hemoglobin'));
      const ferritinInsight = insights.find(i => i.title.toLowerCase().includes('ferritin'));
      expect(hemoInsight).toBeDefined();
      expect(ferritinInsight).toBeDefined();
      expect(hemoInsight!.title).not.toBe(ferritinInsight!.title);
    });

    it('ferritin and serum_iron produce distinct insights with unique titles', () => {
      const insights = generatePeak360Insights({
        age: 40,
        gender: 'male',
        markers: [
          { testKey: 'ferritin', label: 'Ferritin', value: 5 },
          { testKey: 'serumIron', label: 'Serum Iron', value: 3 },
        ],
      });
      const titles = insights.map(i => i.title);
      const ferritinTitle = titles.find(t => t.toLowerCase().includes('ferritin'));
      const serumIronTitle = titles.find(t => t.toLowerCase().includes('serum iron'));
      expect(ferritinTitle).toBeDefined();
      expect(serumIronTitle).toBeDefined();
      expect(ferritinTitle).not.toBe(serumIronTitle);
    });
  });

  describe('new marker cases', () => {
    it('hemoglobin flagged generates a distinct insight', () => {
      const insights = generatePeak360Insights({
        markers: [{ testKey: 'hemoglobin', label: 'Hemoglobin', value: 80 }],
      });
      const hemo = insights.find(i => i.title.toLowerCase().includes('hemoglobin'));
      expect(hemo).toBeDefined();
    });

    it('uric_acid flagged generates an insight', () => {
      const insights = generatePeak360Insights({
        markers: [{ testKey: 'uric_acid', label: 'Uric Acid', value: 600 }],
      });
      const uric = insights.find(i => i.title.toLowerCase().includes('uric acid'));
      expect(uric).toBeDefined();
    });

    it('dheas flagged generates an insight', () => {
      const insights = generatePeak360Insights({
        markers: [{ testKey: 'dheas', label: 'DHEA-S', value: 0.5 }],
      });
      const dheas = insights.find(i => i.title.toLowerCase().includes('dhea'));
      expect(dheas).toBeDefined();
    });

    it('fsh flagged generates an insight', () => {
      const insights = generatePeak360Insights({
        markers: [{ testKey: 'fsh', label: 'FSH', value: 50 }],
      });
      const fsh = insights.find(i => i.title.toLowerCase().includes('reproductive') || i.title.toLowerCase().includes('fsh'));
      expect(fsh).toBeDefined();
    });
  });
});
