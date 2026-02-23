import { getPeak360Rating, tierScore } from './ratings';
import type { RatingTier, RatingResult } from '@/types/normative';

interface Insight {
  title: string;
  why: string;
  doNow: string[];
}

interface MarkerInput {
  testKey: string;
  label: string;
  value: number | string | null;
}

export function generatePeak360Insights({
  age,
  gender,
  markers,
}: {
  age?: number | null;
  gender?: string | null;
  markers: MarkerInput[];
}): Insight[] {
  const insights: Insight[] = [];
  const action = (title: string, why: string, doNow: string[] = []) =>
    insights.push({ title, why, doNow });

  const flagIf = (key: string, label: string, value: number | string | null, rating: RatingResult | null) => {
    if (!value) return;
    const tier: RatingTier = rating?.tier || 'normal';
    const r = tierScore(tier);
    if (r >= 3) return;

    switch (key) {
      case 'ldl':
      case 'ldl_cholesterol':
      case 'apoB':
      case 'cholesterol_total':
      case 'triglycerides':
        action(
          'Cardio-metabolic risk flags',
          `${label} is rated **${tier}** for age/sex norms. This can correlate with higher long-term cardiovascular risk, especially if multiple lipids are flagged together.`,
          [
            'Prioritize 25-40g/day fibre (veg, legumes, oats), and aim for 2-3 oily fish meals/week (or discuss omega-3 with clinician).',
            'Reduce ultra-processed fats/sugars; bias toward olive oil, nuts, whole foods.',
            'Add 150-300 min/week zone 2 work + 2-3 strength sessions/week.',
            'Re-test in 8-12 weeks after lifestyle block.',
          ]
        );
        break;

      case 'hdl':
      case 'hdl_cholesterol':
        action(
          'Protective cholesterol low',
          `${label} is rated **${tier}**. HDL is not "the whole story", but low HDL often tracks with low activity, poor sleep, insulin resistance, or smoking.`,
          [
            'Increase weekly aerobic volume (especially zone 2) and include intervals 1-2x/week.',
            'Strength training 2-4x/week; prioritize large muscle groups.',
            'Improve sleep consistency; reduce alcohol if intake is high.',
          ]
        );
        break;

      case 'glucose':
      case 'fasting_glucose':
      case 'hba1c':
      case 'insulin':
        action(
          'Glucose regulation needs work',
          `${label} is rated **${tier}**. This suggests suboptimal glycaemic control (energy swings, appetite dysregulation, higher cardiometabolic risk).`,
          [
            'Aim for 10-15 min brisk walk after meals (big win, tiny cost).',
            'Protein at each meal (25-40g), and start meals with protein/veg before carbs.',
            'Keep high-sugar snacks rare; increase whole-food carbs around training.',
            'Consider clinician discussion about further testing if multiple markers are flagged.',
          ]
        );
        break;

      case 'hsCRP':
      case 'crp_hs':
      case 'homocysteine':
        action(
          'Inflammation / vascular stress elevated',
          `${label} is rated **${tier}**. This can reflect infection/injury, poor recovery, smoking, or chronic inflammatory load.`,
          [
            'Audit recovery: sleep, stress, alcohol, training load (deload if needed).',
            'Whole-food anti-inflammatory bias (plants, omega-3s, spices).',
            'If recently ill/injured, re-test when fully recovered.',
          ]
        );
        break;

      case 'vitaminD':
      case 'vitamin_d_25oh':
        action(
          'Vitamin D low',
          `${label} is rated **${tier}**. Low vitamin D is common and can impact bone health, immune function, and mood in some people.`,
          [
            'Sun exposure as appropriate (skin safety first), and dietary sources (eggs, salmon).',
            'Discuss supplementation dose with a clinician, then re-test in 8-12 weeks.',
          ]
        );
        break;

      case 'ferritin':
      case 'serumIron':
        action(
          'Iron status concern',
          `${label} is rated **${tier}**. Low iron stores can reduce performance and recovery; high stores can also be a flag depending on context.`,
          [
            'If low: increase iron-rich foods + vitamin C pairing; consider clinician workup.',
            'If high: discuss with clinician (inflammation, liver, genetics) before supplementing anything.',
          ]
        );
        break;

      case 'tsh':
      case 'ft3':
      case 'ft4':
        action(
          'Thyroid markers flagged',
          `${label} is rated **${tier}**. Thyroid patterns are context-heavy and should be interpreted with symptoms and clinician guidance.`,
          [
            'If fatigue/cold intolerance/weight changes present, discuss full thyroid review with clinician.',
            'Ensure adequate calories/protein if training volume is high.',
          ]
        );
        break;

      case 'totalTestosterone':
      case 'freeTestosterone':
      case 'oestradiol':
      case 'shbg':
        action(
          'Sex hormone markers flagged',
          `${label} is rated **${tier}**. Hormones are sensitive to sleep, energy availability, stress, and training load.`,
          [
            'Prioritize sleep (7.5-9h), manage stress, and avoid chronic under-eating.',
            'If symptoms present, discuss with clinician; avoid self-prescribing.',
          ]
        );
        break;

      case 'creatinine':
      case 'egfr':
      case 'bun':
        action(
          'Kidney markers flagged',
          `${label} is rated **${tier}**. These can be influenced by hydration, creatine use, high-protein intake, and muscle mass.`,
          [
            'Re-test well-hydrated and avoid hard training 24-48h prior.',
            'Discuss with clinician if persistent or worsening.',
          ]
        );
        break;

      case 'alt':
      case 'ast':
      case 'ggt':
        action(
          'Liver markers flagged',
          `${label} is rated **${tier}**. Can reflect alcohol intake, fatty liver risk, meds/supplements, or recent intense training.`,
          [
            'Limit alcohol for 4-8 weeks and re-test.',
            'Avoid very hard training 24-48h before test (AST/ALT can rise with muscle damage).',
            'Discuss meds/supplements with clinician if persistent.',
          ]
        );
        break;

      default:
        action(
          'Marker out of range',
          `${label} is rated **${tier}**. This is a signal to review context, symptoms, and trends.`,
          ['Re-test and/or discuss with clinician if persistent.']
        );
    }
  };

  (markers || []).forEach((m) => {
    const rating = getPeak360Rating(m.testKey, m.value, age, gender);
    flagIf(m.testKey, m.label, m.value, rating);
  });

  // De-duplicate identical titles
  const seen = new Set<string>();
  return insights.filter((x) => {
    if (seen.has(x.title)) return false;
    seen.add(x.title);
    return true;
  });
}
