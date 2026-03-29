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

const PROVIDER_PREFIX = 'Based on normative ranges, consider discussing with your healthcare provider.';

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
    insights.push({ title, why: `${PROVIDER_PREFIX} ${why}`, doNow });

  const flagIf = (key: string, label: string, value: number | string | null, rating: RatingResult | null) => {
    if (!value) return;
    const tier: RatingTier = rating?.tier || 'normal';
    const r = tierScore(tier);
    // If rating data exists and tier is normal or better, skip (no concern).
    // If no normative data (rating is null), still flag -- the marker was provided
    // for review and we should give guidance even without tier classification.
    if (rating !== null && r >= 3) return;

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
            'Prioritize 25-40g/day soluble fibre (oats, barley, legumes, apples, citrus), and aim for 2-3 oily fish meals/week.',
            'Consider omega-3 supplementation (EPA/DHA 1-2g/day) -- discuss with your healthcare provider.',
            'Psyllium husk 5-10g/day or oat beta-glucan for additional fibre support.',
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
            'Niacin (vitamin B3) may support HDL -- discuss with clinician before supplementing.',
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
            'Time carbohydrates around training; prefer whole grains, sweet potato, legumes over refined carbs.',
            'Consider berberine 500mg 2x/day or magnesium glycinate 200-400mg/day -- discuss with clinician.',
            'Chromium picolinate 200-1000mcg/day may support glucose metabolism -- discuss with healthcare provider.',
            'Re-test and discuss with clinician if multiple glucose markers are flagged.',
          ]
        );
        break;

      case 'hsCRP':
      case 'crp_hs':
        action(
          'Inflammation / vascular stress elevated',
          `${label} is rated **${tier}**. This can reflect infection/injury, poor recovery, smoking, or chronic inflammatory load.`,
          [
            'Audit recovery: sleep, stress, alcohol, training load (deload if needed).',
            'Whole-food anti-inflammatory bias (plants, omega-3s, spices).',
            'Omega-3 EPA/DHA 1-2g/day for inflammatory support -- discuss with clinician.',
            'If recently ill/injured, re-test when fully recovered.',
          ]
        );
        break;

      case 'homocysteine':
        action(
          'Homocysteine elevated',
          `${label} is rated **${tier}**. Elevated homocysteine is associated with vascular stress and may reflect methylation issues.`,
          [
            'Consider methylated B vitamins: methylfolate 400-800mcg, methylcobalamin 1000mcg, P5P 25-50mg -- discuss with clinician.',
            'Omega-3 EPA/DHA 1-2g/day for inflammatory support.',
            'Whole-food anti-inflammatory bias (leafy greens, legumes, eggs).',
            'Re-test in 8-12 weeks after supplementation and discuss with healthcare provider.',
          ]
        );
        break;

      case 'vitaminD':
      case 'vitamin_d_25oh':
        action(
          'Vitamin D low',
          `${label} is rated **${tier}**. Low vitamin D is common and can impact bone health, immune function, and mood in some people.`,
          [
            'Consider Vitamin D3 supplementation 2000-4000 IU/day (with K2 for absorption) -- discuss with healthcare provider.',
            'Dietary sources: eggs, salmon, fortified foods.',
            '10-20 minutes midday sun exposure on arms/legs when possible (skin safety considered).',
            'Re-test in 8-12 weeks after supplementation and discuss with clinician.',
          ]
        );
        break;

      case 'ferritin':
        action(
          'Ferritin (iron stores) flagged',
          `${label} is rated **${tier}**. Low ferritin indicates depleted iron stores which can reduce performance, recovery, and energy.`,
          [
            'If low: consider iron bisglycinate 25-50mg/day with vitamin C for absorption -- discuss with healthcare provider.',
            'Increase iron-rich foods: red meat, liver, spinach, legumes, fortified cereals; pair with vitamin C (citrus, capsicum) for absorption.',
            'If high: discuss with clinician (inflammation, liver, genetics) before supplementing anything.',
            'Re-test in 8-12 weeks.',
          ]
        );
        break;

      case 'serumIron':
      case 'serum_iron':
        action(
          'Serum iron levels flagged',
          `${label} is rated **${tier}**. Serum iron reflects circulating iron and can fluctuate with recent meals and inflammation.`,
          [
            'If low: consider iron bisglycinate 25-50mg/day with vitamin C for absorption -- discuss with healthcare provider.',
            'Iron-rich foods: red meat, liver, spinach, legumes, fortified cereals.',
            'If high: discuss with clinician (haemochromatosis screening may be appropriate).',
            'Re-test fasted for more accurate reading.',
          ]
        );
        break;

      case 'hemoglobin':
      case 'hematocrit':
      case 'rbc':
        action(
          `${label} flagged`,
          `${label} is rated **${tier}**. Abnormal values may reflect iron deficiency, dehydration, or other haematological concerns.`,
          [
            'If low: increase iron-rich foods (red meat, spinach, legumes) paired with vitamin C for absorption.',
            'Ensure adequate hydration and nutrition.',
            'If persistently abnormal, full blood count review with clinician is recommended.',
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
            'Ensure selenium 100-200mcg/day (supports thyroid function) -- discuss with clinician.',
            'Iodine status may be relevant -- discuss testing with clinician.',
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
            'Ensure zinc 15-30mg/day and magnesium 200-400mg/day (common cofactors for hormone production).',
            'Hormone optimization requires clinician guidance -- do not self-prescribe.',
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
            'Ensure adequate hydration (2-3L water/day).',
            'Re-test well-hydrated and avoid hard training 24-48h prior.',
            'Discuss protein intake levels with clinician if creatinine is persistently elevated.',
          ]
        );
        break;

      case 'uric_acid':
        action(
          'Uric acid flagged',
          `${label} is rated **${tier}**. Elevated uric acid can increase risk of gout and may reflect dietary or metabolic factors.`,
          [
            'Reduce purine-rich foods (organ meats, shellfish, alcohol -- especially beer).',
            'Increase hydration (2-3L water/day).',
            'Tart cherry extract 500-1000mg/day may help -- discuss with healthcare provider.',
            'Discuss with clinician if persistently elevated or symptomatic.',
          ]
        );
        break;

      case 'dheas':
        action(
          'DHEA-S flagged',
          `${label} is rated **${tier}**. DHEA-S reflects adrenal function and can be affected by stress, sleep, and ageing.`,
          [
            'Prioritize stress management: meditation, breathing exercises, adequate rest days.',
            'Optimise sleep quality and duration (7-9h).',
            'Discuss adrenal support strategies with clinician -- do not self-supplement DHEA without guidance.',
          ]
        );
        break;

      case 'fsh':
      case 'lh':
        action(
          'Reproductive hormone flagged',
          `${label} is rated **${tier}**. FSH/LH levels are context-dependent (age, menstrual cycle phase for females, time of day).`,
          [
            'Results should be interpreted by a clinician in the context of symptoms, age, and cycle phase.',
            'For females: note cycle day at time of blood draw for accurate interpretation.',
            'Discuss with healthcare provider for comprehensive reproductive hormone assessment.',
          ]
        );
        break;

      case 'grip_strength_left':
      case 'grip_strength_right':
        action(
          'Grip strength needs improvement',
          `${label} is rated **${tier}**. Grip strength is one of the strongest predictors of all-cause mortality and functional independence.`,
          [
            'Train grip 2-3x/week: dead hangs, farmer carries, heavy rows, and dedicated grip work.',
            'Include both crush grip (squeezing) and support grip (hanging/carrying) exercises.',
            'Aim for progressive overload -- add time or load each week.',
            'Discuss with clinician if grip weakness is sudden or unilateral.',
          ]
        );
        break;

      case 'cmj_left':
      case 'cmj_right':
      case 'single_leg_hop_left':
      case 'single_leg_hop_right':
        action(
          'Lower-body power below target',
          `${label} is rated **${tier}**. Jump performance reflects explosive power, which declines faster than strength with age.`,
          [
            'Include plyometric training 1-2x/week (box jumps, depth jumps, bounding).',
            'Prioritize heavy compound lifts (squats, deadlifts) to build the force base.',
            'Address any notable L/R asymmetry with unilateral exercises.',
            'Discuss with clinician if joint pain or instability limits training.',
          ]
        );
        break;

      case 'imtp_max_force':
        action(
          'Peak force production flagged',
          `${label} is rated **${tier}**. Isometric mid-thigh pull reflects maximal lower-body force -- critical for injury resilience and performance.`,
          [
            'Focus on heavy compound pulls: deadlifts, trap bar deadlifts, hip thrusts.',
            'Include isometric holds at mid-range (2-4 sets of 3-5 sec max effort).',
            'Ensure adequate recovery between heavy sessions (48-72h).',
            'Discuss with clinician if pain or injury history limits progress.',
          ]
        );
        break;

      case 'single_leg_balance_left':
      case 'single_leg_balance_right':
        action(
          'Balance and stability needs work',
          `${label} is rated **${tier}**. Poor single-leg balance correlates with fall risk and may indicate proprioceptive or ankle/hip deficits.`,
          [
            'Practice single-leg stance daily: eyes open then eyes closed (30-60 sec).',
            'Add single-leg exercises to training: split squats, step-ups, single-leg RDLs.',
            'Consider barefoot training on varied surfaces to improve proprioception.',
            'Discuss with clinician if balance issues are new or worsening.',
          ]
        );
        break;

      case 'shoulder_iso_y_left':
      case 'shoulder_iso_y_right':
        action(
          'Shoulder stability below target',
          `${label} is rated **${tier}**. Shoulder Iso-Y strength reflects rotator cuff and scapular stability -- important for overhead function and injury prevention.`,
          [
            'Include band or light dumbbell Y-raises 2-3x/week (2-3 sets of 12-15).',
            'Strengthen lower traps and serratus anterior with wall slides and push-up plus.',
            'Address any notable L/R asymmetry before progressing load on overhead movements.',
            'Discuss with clinician or physio if shoulder pain is present.',
          ]
        );
        break;

      case 'pushups_max':
        action(
          'Push-up endurance below target',
          `${label} is rated **${tier}**. Push-up capacity is linked to cardiovascular health and upper-body muscular endurance.`,
          [
            'Train push-ups 3-4x/week using a progression plan (grease the groove or pyramid sets).',
            'Strengthen chest, triceps, and core with bench press, dips, and planks.',
            'If below 10 reps, start with incline push-ups and progress to floor.',
            'Discuss with clinician if chest pain or discomfort during exertion.',
          ]
        );
        break;

      case 'dead_man_hang':
        action(
          'Hang time needs improvement',
          `${label} is rated **${tier}**. Dead man hang tests grip endurance and shoulder health -- both critical for longevity.`,
          [
            'Practice dead hangs daily: accumulate 2-3 min total hang time.',
            'Progress from passive hangs to active hangs (scapular engagement).',
            'Combine with grip-specific work: plate pinches, towel hangs.',
            'Discuss with clinician if shoulder pain limits hanging.',
          ]
        );
        break;

      case 'farmers_carry_distance':
        action(
          'Loaded carry capacity flagged',
          `${label} is rated **${tier}**. Farmers carry performance reflects whole-body functional strength, grip endurance, and core stability.`,
          [
            'Include loaded carries 2x/week: farmer walks, suitcase carries, overhead carries.',
            'Progress by increasing distance before increasing load.',
            'Ensure upright posture and core bracing throughout the carry.',
            'Discuss with clinician if back pain or grip issues limit progress.',
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
            'Consider milk thistle (silymarin) 150-300mg/day for liver support -- discuss with clinician.',
            'N-acetyl cysteine (NAC) 600-1200mg/day may support glutathione -- discuss with healthcare provider.',
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
