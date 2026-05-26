import type { RatingTier } from '@/types/normative';

/**
 * Phase 11 — researched DRAFT seed content for every REPORT_MARKERS testKey
 * (D-09). These are editable defaults: the idempotent seed in runMigrations()
 * inserts a row per marker only if one does not already exist, so an admin's
 * later edits are never clobbered. Admins refine this copy in the
 * /portal/admin/marker-content editor.
 *
 * Shape mirrors the marker_content table (D-08):
 *   definition     — gender-neutral, "what it is" (D-04)
 *   impact         — gender-neutral, "how it affects you" (D-04)
 *   coachInsights  — 5 tiers (poor/cautious/normal/great/elite) x {male,female} (D-05)
 *
 * Tone (D-14): consumer-friendly, no disease-prevention or longevity
 * guarantees, no fabricated numeric thresholds. Coach insights describe
 * behaviour and next actions, not invented reference ranges. The tier labels
 * the client sees are Attention (poor) / Cautious / Normal / Optimal (great) /
 * Peak (elite) — see TIER_LABELS in src/types/normative.ts.
 */

export interface SeedMarkerContent {
  definition: string;
  impact: string;
  coachInsights: Record<RatingTier, { male: string; female: string }>;
}

/**
 * Helper: many markers have gender-neutral coaching where the same guidance
 * reads identically for male and female clients. This keeps the table honest
 * (every tier x gender slot is populated, per D-05) without inventing spurious
 * gender differences. Markers with genuinely gender-specific framing (e.g.
 * hormones, body composition) author male/female text separately.
 */
function bothGenders(
  tiers: Record<RatingTier, string>
): Record<RatingTier, { male: string; female: string }> {
  return {
    poor: { male: tiers.poor, female: tiers.poor },
    cautious: { male: tiers.cautious, female: tiers.cautious },
    normal: { male: tiers.normal, female: tiers.normal },
    great: { male: tiers.great, female: tiers.great },
    elite: { male: tiers.elite, female: tiers.elite },
  };
}

export const SEED_MARKER_CONTENT: Record<string, SeedMarkerContent> = {
  // ──────────────────────────────────────────────────────────────────────
  // Blood Tests & Biomarkers — Lipid Panel
  // ──────────────────────────────────────────────────────────────────────
  cholesterol_total: {
    definition:
      'Total cholesterol is the combined amount of cholesterol carried in your blood across all lipoprotein types. It is a broad summary number rather than a single risk signal — the balance between its components matters more than the total alone.',
    impact:
      'On its own the total tells you relatively little; the same number can reflect a healthy profile rich in protective HDL or a riskier one driven by LDL. It is most useful read alongside LDL, HDL and triglycerides for a fuller picture.',
    coachInsights: bothGenders({
      poor: 'Your total cholesterol sits in the Attention range. The priority is to look at what is driving it — usually LDL and triglycerides — so book in to review the full lipid panel and start with diet and aerobic activity. Re-test in 8–12 weeks.',
      cautious:
        'Your total cholesterol is mildly above the optimal band. Not urgent, but a good lever to pull now. Lean into soluble fibre, oily fish and regular aerobic exercise, and recheck it with LDL and ApoB at the next draw.',
      normal:
        'Your total cholesterol is in a healthy range. Keep the habits that got you here and read it alongside HDL and triglycerides to confirm the balance is favourable.',
      great:
        'Your total cholesterol is in a strong range with a favourable balance. Maintain your current activity and whole-food pattern — this is a habit worth protecting.',
      elite:
        'Your total cholesterol sits in an excellent band. This reflects consistent training and diet. Use it as an anchor while we work any markers that need attention.',
    }),
  },
  ldl_cholesterol: {
    definition:
      'Low-density lipoprotein (LDL) carries cholesterol from the liver out to the tissues. When there is more than the body needs, the excess can deposit in artery walls, which is why LDL is a primary lipid target.',
    impact:
      'Higher LDL sustained over years is associated with gradual plaque build-up in arteries. The effect compounds slowly, so getting it into a healthy band early tends to pay off disproportionately.',
    coachInsights: bothGenders({
      poor: 'Your LDL is in the Attention range and worth acting on. Shift saturated fat toward olive oil, nuts, oily fish and soluble fibre (oats, legumes), build aerobic volume, and recheck alongside ApoB. If it stays high, we will arrange a clinical review.',
      cautious:
        'Your LDL is mildly above the optimal band — not urgent, but a clear lever while it is easy. Swap saturated fats for monounsaturated sources, add soluble fibre daily, and keep building aerobic exercise. Recheck with ApoB next draw for a sharper read.',
      normal:
        'Your LDL is in a healthy range. Maintain the diet and activity supporting it, and keep an eye on it alongside ApoB at routine bloods.',
      great:
        'Your LDL is in a strong, favourable band. Keep the current pattern — protective lipid numbers like this are worth maintaining deliberately.',
      elite:
        'Your LDL is excellent. This is a genuine strength in your cardiometabolic profile; sustain the habits driving it and use it as a stable anchor.',
    }),
  },
  hdl_cholesterol: {
    definition:
      "High-density lipoprotein (HDL) helps move excess cholesterol from the bloodstream back to the liver for processing — often described as the 'protective' lipid fraction.",
    impact:
      'Higher HDL is generally associated with a more favourable cardiovascular picture and tends to reflect good activity levels, healthy fats and low metabolic stress. Very low HDL is worth addressing through lifestyle.',
    coachInsights: bothGenders({
      poor: 'Your HDL is lower than ideal, which usually responds well to lifestyle change. Prioritise regular aerobic exercise, healthy unsaturated fats (olive oil, nuts, oily fish) and reducing refined carbohydrate. Recheck after a consistent training block.',
      cautious:
        'Your HDL is slightly below the optimal band. Aerobic exercise is the single biggest lever here, alongside healthy-fat intake. Keep at it and recheck after 8–12 weeks of consistency.',
      normal:
        'Your HDL is in a healthy range. Maintain your aerobic activity and fat quality — both keep this fraction strong.',
      great:
        'Your HDL is in a strong band, a good sign your activity and diet are working in your favour. Keep it up.',
      elite:
        'Excellent — your HDL is in the Peak range. This is a genuine strength in your profile; keep doing what is driving it and use it as an anchor while addressing other markers.',
    }),
  },
  triglycerides: {
    definition:
      'Triglycerides are the main form in which fat is stored and transported in the blood. Levels respond quickly to recent meals, alcohol and refined carbohydrate, making them a sensitive read on short-term metabolic load.',
    impact:
      'Persistently raised triglycerides often travel with insulin resistance and a less favourable lipid balance. The upside is they respond fast to changes in diet, alcohol and activity.',
    coachInsights: bothGenders({
      poor: 'Your triglycerides are in the Attention range. Cut back on refined carbohydrate, sugar and alcohol, add oily fish and aerobic exercise, and confirm the sample was genuinely fasted. These numbers usually move quickly once the inputs change.',
      cautious:
        'Your triglycerides are mildly raised. Trim added sugar and alcohol, build aerobic volume, and re-test fasted. This is one of the most responsive markers to lifestyle change.',
      normal:
        'Your triglycerides are in a healthy range, a good sign of steady metabolic handling of fats. Maintain your current pattern.',
      great:
        'Your triglycerides are in a strong band. Keep the diet and activity supporting them — this reflects good metabolic control.',
      elite:
        'Your triglycerides are excellent, pointing to very clean metabolic handling. Sustain the habits behind it.',
    }),
  },
  apob: {
    definition:
      'Apolipoprotein B (ApoB) is a protein found on the surface of the cholesterol-carrying particles most associated with arterial plaque. Because there is one ApoB per particle, it counts how many of these particles you actually have.',
    impact:
      'ApoB is often a sharper read on cardiovascular risk than LDL alone, since two people with the same LDL can carry very different particle numbers. Lower ApoB generally reflects a cleaner risk picture.',
    coachInsights: bothGenders({
      poor: 'Your ApoB is in the Attention range, suggesting a high number of atherogenic particles. Treat this as a priority: focus on the same levers as LDL — fibre, healthy fats, aerobic work — and review with a clinician given how strongly ApoB tracks risk.',
      cautious:
        'Your ApoB is mildly elevated. Work the diet and aerobic levers that lower LDL, and recheck it alongside LDL next draw — together they give a clearer particle picture.',
      normal:
        'Your ApoB is in a reasonable range. Keep the habits supporting your lipids and continue to track it alongside LDL.',
      great:
        'Your ApoB is in a strong band, a favourable sign for particle burden. Maintain your current pattern.',
      elite:
        'Your ApoB is excellent, indicating a low atherogenic particle count. This is a real strength worth protecting.',
    }),
  },
  lpa: {
    definition:
      'Lipoprotein(a), or Lp(a), is a cholesterol-carrying particle whose level is largely set by your genetics and stays fairly stable through life. It is measured to add genetic context to your cardiovascular picture.',
    impact:
      'Because Lp(a) is mostly inherited, it does not respond much to diet or exercise. A raised level is useful to know so other modifiable risk factors can be managed more attentively.',
    coachInsights: bothGenders({
      poor: 'Your Lp(a) is raised. As this is largely genetic, the action is not to chase the number down but to be more attentive to everything you can change — LDL, ApoB, blood pressure, activity. Discuss the result with a clinician for context.',
      cautious:
        'Your Lp(a) is mildly elevated. It is genetically driven, so focus your energy on the modifiable markers around it and keep the rest of your cardiovascular profile tight.',
      normal:
        'Your Lp(a) is in a reassuring range. As it is stable over time, a single normal reading is informative — keep managing the modifiable markers as usual.',
      great:
        'Your Lp(a) is low, removing one inherited risk factor from the picture. Keep your other lipids and lifestyle markers strong.',
      elite:
        'Your Lp(a) is very low — a favourable genetic card. Maintain the broader healthy pattern that supports the rest of your profile.',
    }),
  },

  // ──────────────────────────────────────────────────────────────────────
  // Glucose & Metabolic
  // ──────────────────────────────────────────────────────────────────────
  fasting_glucose: {
    definition:
      'Fasting glucose is the amount of sugar in your blood after an overnight fast. It is a snapshot of how well your body keeps glucose in check when it has not recently been fed.',
    impact:
      'A single fasting reading can be nudged by stress, illness or a short fast, so it is best read alongside HbA1c. Consistently raised fasting glucose can be an early sign that glucose handling is drifting.',
    coachInsights: bothGenders({
      poor: 'Your fasting glucose is in the Attention range. Confirm it with HbA1c and a repeat fasted sample, then focus on the basics that move it: regular movement after meals, lower refined carbohydrate, and steady sleep. Review with a clinician.',
      cautious:
        'Your fasting glucose is mildly raised. Add a short walk after meals, trim refined carbohydrate, and recheck alongside HbA1c — together they tell a clearer story than either alone.',
      normal:
        'Your fasting glucose is in a healthy range, a good sign of steady glucose control. Maintain your current activity and whole-food pattern.',
      great:
        'Your fasting glucose is in a strong band. Keep the habits supporting it — consistent movement and a whole-food diet do most of the work here.',
      elite:
        'Your fasting glucose is excellent, reflecting very clean glucose handling. Sustain the routine behind it.',
    }),
  },
  hba1c: {
    definition:
      'Glycated haemoglobin (HbA1c) reflects your average blood glucose over roughly the past three months. It is a stable window into glucose control rather than a single moment in time.',
    impact:
      'Staying in a healthy range supports steady energy and protects against the drift toward insulin resistance. Because it averages months, it is harder to game and a reliable progress marker.',
    coachInsights: bothGenders({
      poor: 'Your HbA1c is in the Attention range, indicating glucose has been running high on average. Prioritise consistent movement, reduce refined carbohydrate and sugary drinks, and review with a clinician. As it averages three months, give changes a full quarter before re-testing.',
      cautious:
        'Your HbA1c is mildly above optimal. Tighten refined-carbohydrate intake, add post-meal movement, and recheck in about three months — this marker rewards consistency over quick fixes.',
      normal:
        'Your HbA1c is comfortably in the normal range — good metabolic control. The goal now is simply to hold it here with your current activity and whole-food pattern.',
      great:
        'Your HbA1c is in a strong band. Maintain current activity and keep added sugar occasional rather than habitual.',
      elite:
        'Your HbA1c is excellent, reflecting very steady glucose control over months. Keep the routine that produced it.',
    }),
  },
  insulin: {
    definition:
      'Insulin is the hormone that moves glucose out of the blood and into cells. Fasting insulin shows how hard your body is working to keep blood sugar stable when at rest.',
    impact:
      'Raised fasting insulin can appear before glucose itself drifts, making it an early read on insulin resistance. Lower, stable insulin generally reflects good metabolic flexibility.',
    coachInsights: bothGenders({
      poor: 'Your fasting insulin is high, which can signal your body is working hard to manage glucose. Focus on resistance training, aerobic work, and reducing refined carbohydrate — these improve insulin sensitivity directly. Review the full metabolic picture with a clinician.',
      cautious:
        'Your fasting insulin is mildly raised. Build muscle through resistance training, add aerobic volume, and trim refined carbohydrate — all sharpen insulin sensitivity. Recheck alongside glucose and HbA1c.',
      normal:
        'Your fasting insulin is in a reasonable range. Maintain the activity and diet keeping it there.',
      great:
        'Your fasting insulin is in a strong band, a good sign of metabolic flexibility. Keep training and eating as you are.',
      elite:
        'Your fasting insulin is excellent, indicating high insulin sensitivity. This is a real metabolic strength to protect.',
    }),
  },

  // ──────────────────────────────────────────────────────────────────────
  // Inflammation
  // ──────────────────────────────────────────────────────────────────────
  crp_hs: {
    definition:
      'High-sensitivity C-reactive protein (hs-CRP) measures low-grade systemic inflammation. The liver releases it in response to inflammatory signalling, and the high-sensitivity assay can pick up subtle background levels.',
    impact:
      'Chronically raised hs-CRP tracks with insulin resistance, poor recovery and visceral fat. A single high reading can also reflect a recent cold or hard training block, so context matters.',
    coachInsights: bothGenders({
      poor: 'Your hs-CRP is elevated, signalling background inflammation. First confirm it is not a transient spike — re-test when fully recovered and infection-free. Then prioritise sleep, omega-3 intake, a fibre-rich whole-food diet, and address visceral fat and any untreated dental or gut issues.',
      cautious:
        'Your hs-CRP is mildly raised. Rule out a recent illness or heavy training as the cause, then lean into sleep, omega-3s and a low-processed diet. Recheck when fully recovered.',
      normal:
        'Your hs-CRP is in a healthy range, suggesting low background inflammation. Maintain the sleep, diet and recovery habits supporting it.',
      great:
        'Your hs-CRP is in a strong, low band. Keep the recovery and nutrition habits behind it — low inflammation underpins almost everything else.',
      elite:
        'Your hs-CRP is excellent, indicating very low systemic inflammation. This is a strong foundation; protect your sleep and recovery to keep it there.',
    }),
  },
  homocysteine: {
    definition:
      'Homocysteine is an amino acid the body normally clears using B-vitamins (B12, folate and B6). When those are low, homocysteine can build up.',
    impact:
      'Raised homocysteine is often a sign of low B-vitamin status and tends to respond well to addressing those nutrients. It is read as part of a broader cardiovascular and nutritional picture.',
    coachInsights: bothGenders({
      poor: 'Your homocysteine is raised, which usually points to low B-vitamin status. Review B12, folate and B6 intake, consider a B-complex with a clinician, and address diet quality. Recheck after a sustained period of better intake.',
      cautious:
        'Your homocysteine is mildly elevated. Strengthen dietary sources of B12, folate and B6 (leafy greens, eggs, fish, legumes) and recheck — it often responds quickly to better B-vitamin status.',
      normal:
        'Your homocysteine is in a healthy range, suggesting good B-vitamin status. Maintain a varied, nutrient-dense diet.',
      great:
        'Your homocysteine is in a strong band. Keep up the diet quality supporting your B-vitamin status.',
      elite:
        'Your homocysteine is excellent, reflecting good methylation and B-vitamin status. Sustain your current nutrition.',
    }),
  },
  ck: {
    definition:
      'Creatine kinase (CK) is an enzyme released when muscle is stressed or broken down. After hard or unfamiliar training it rises temporarily as part of normal muscle turnover.',
    impact:
      'A raised CK in an active person often simply reflects recent intense exercise. Persistently high levels unrelated to training are worth discussing with a clinician.',
    coachInsights: bothGenders({
      poor: 'Your CK is high. If you trained hard recently, this is likely exercise-related — re-test after a few rest days. If it stays elevated without obvious cause, review with a clinician.',
      cautious:
        'Your CK is mildly raised, commonly from recent or unaccustomed training. Allow a recovery window and re-test rested to see the true baseline.',
      normal:
        'Your CK is in a normal range, consistent with good muscle recovery. No action needed beyond your usual training balance.',
      great:
        'Your CK is in a comfortable band, suggesting your training load and recovery are well matched. Keep that balance.',
      elite:
        'Your CK is low-normal, a sign of good recovery relative to your training. Maintain your current load management.',
    }),
  },
  uric_acid: {
    definition:
      'Uric acid is a waste product from the breakdown of purines, found in some foods and produced by the body. The kidneys clear most of it.',
    impact:
      'Raised uric acid can be linked to diet, alcohol and metabolic load, and at higher levels to joint discomfort. It is read alongside the broader metabolic picture.',
    coachInsights: bothGenders({
      poor: 'Your uric acid is in the Attention range. Reduce alcohol, sugary drinks and very high-purine foods, stay well hydrated, and review with a clinician if you have joint symptoms. Recheck after sustained changes.',
      cautious:
        'Your uric acid is mildly raised. Trim alcohol and sugary drinks, hydrate well, and recheck — diet and fluids often move it meaningfully.',
      normal:
        'Your uric acid is in a healthy range. Maintain good hydration and a balanced diet.',
      great:
        'Your uric acid is in a strong band. Keep the hydration and diet habits supporting it.',
      elite:
        'Your uric acid is excellent. Sustain your current diet and fluid intake.',
    }),
  },

  // ──────────────────────────────────────────────────────────────────────
  // Vitamins & Minerals
  // ──────────────────────────────────────────────────────────────────────
  vitamin_d_25oh: {
    definition:
      'Vitamin D (measured as 25-hydroxy vitamin D) is a hormone-like nutrient made in the skin from sunlight and obtained from some foods. It supports bone, muscle and immune function.',
    impact:
      'Low vitamin D is common, especially in low-sunlight seasons, and can affect mood, bone strength and immune resilience. It usually responds well to sensible sun exposure and supplementation.',
    coachInsights: bothGenders({
      poor: 'Your vitamin D is low. Sensible sun exposure helps, but at this level a supplement is usually the practical fix — discuss dosing with a clinician. Recheck after a sustained period to confirm it has come up.',
      cautious:
        'Your vitamin D is mildly low. Add sensible sun exposure and consider a daily supplement, especially through darker months, then recheck.',
      normal:
        'Your vitamin D is in a healthy range. Maintain sun exposure and any supplement habit, particularly in winter.',
      great:
        'Your vitamin D is in a strong band. Keep your current sun exposure and supplement routine consistent through the seasons.',
      elite:
        'Your vitamin D is excellent. Maintain your routine and recheck periodically, as levels can dip in low-sunlight months.',
    }),
  },
  vitamin_b12: {
    definition:
      'Vitamin B12 is essential for red blood cell formation, nerve function and energy metabolism. It comes mainly from animal foods, so intake matters for plant-based diets.',
    impact:
      'Low B12 can cause fatigue and affect nerve and cognitive function over time. It is straightforward to correct through diet or supplementation once identified.',
    coachInsights: bothGenders({
      poor: 'Your B12 is low. Review your intake — particularly if you eat little animal food — and discuss supplementation or, if needed, further testing with a clinician. Recheck after a sustained period of better intake.',
      cautious:
        'Your B12 is mildly low. Strengthen dietary sources (eggs, fish, meat, fortified foods) or add a supplement, then recheck.',
      normal:
        'Your B12 is in a healthy range. Maintain a varied diet or your current supplement habit.',
      great:
        'Your B12 is in a strong band. Keep the diet or supplementation supporting it.',
      elite:
        'Your B12 is excellent. Sustain your current intake.',
    }),
  },
  folate: {
    definition:
      'Folate (vitamin B9) supports cell division, red blood cell formation and the processing of homocysteine. It is found in leafy greens, legumes and fortified foods.',
    impact:
      'Adequate folate supports healthy blood and helps keep homocysteine in check. Low folate is usually a dietary matter and responds quickly to better intake.',
    coachInsights: bothGenders({
      poor: 'Your folate is low. Increase leafy greens, legumes and fortified foods, and discuss a supplement with a clinician if needed. Recheck after sustained dietary change.',
      cautious:
        'Your folate is mildly low. Add more leafy greens and legumes to your week and recheck — diet usually moves it readily.',
      normal:
        'Your folate is in a healthy range. Maintain a vegetable- and legume-rich diet.',
      great:
        'Your folate is in a strong band. Keep up the plant-rich eating supporting it.',
      elite:
        'Your folate is excellent, reflecting a nutrient-dense diet. Sustain it.',
    }),
  },
  magnesium: {
    definition:
      'Magnesium is a mineral involved in hundreds of processes including muscle and nerve function, energy production and sleep regulation. Blood levels show only part of the body’s total store.',
    impact:
      'Low magnesium can contribute to cramps, poor sleep and fatigue. It is common with low intake of whole foods and usually responds to diet or supplementation.',
    coachInsights: bothGenders({
      poor: 'Your magnesium is low. Prioritise magnesium-rich foods (leafy greens, nuts, seeds, legumes, whole grains) and consider a supplement with a clinician, especially if you have cramps or poor sleep. Recheck after sustained change.',
      cautious:
        'Your magnesium is mildly low. Build in more nuts, seeds and leafy greens, and consider a modest supplement if sleep or cramps are an issue.',
      normal:
        'Your magnesium is in a healthy range. Maintain a whole-food diet rich in plants and nuts.',
      great:
        'Your magnesium is in a strong band. Keep the nutrient-dense diet behind it.',
      elite:
        'Your magnesium is excellent. Sustain your current eating pattern.',
    }),
  },
  zinc: {
    definition:
      'Zinc is a mineral central to immune function, wound healing, taste and many enzyme reactions. It comes from meat, shellfish, legumes and seeds.',
    impact:
      'Low zinc can blunt immune resilience and recovery. It is usually a dietary issue and responds to better intake or short-term supplementation.',
    coachInsights: bothGenders({
      poor: 'Your zinc is low. Increase zinc-rich foods (meat, shellfish, seeds, legumes) and consider a short course of supplementation with a clinician. Recheck after sustained change.',
      cautious:
        'Your zinc is mildly low. Add more zinc-rich foods to your week and recheck — diet usually corrects it.',
      normal:
        'Your zinc is in a healthy range. Maintain a varied diet including quality protein.',
      great:
        'Your zinc is in a strong band. Keep the diet supporting it.',
      elite:
        'Your zinc is excellent. Sustain your current intake.',
    }),
  },

  // ──────────────────────────────────────────────────────────────────────
  // Iron Studies
  // ──────────────────────────────────────────────────────────────────────
  serum_iron: {
    definition:
      'Serum iron measures the iron currently circulating in your blood. It fluctuates through the day and with recent meals, so it is interpreted alongside ferritin and transferrin saturation.',
    impact:
      'Iron is needed to carry oxygen in the blood. Both low and high iron matter, which is why it is read as part of a full iron panel rather than in isolation.',
    coachInsights: bothGenders({
      poor: 'Your serum iron is outside the healthy band. Iron should be interpreted with ferritin and transferrin saturation, so review the full panel with a clinician before changing intake or supplementing — both too little and too much iron carry consequences.',
      cautious:
        'Your serum iron is borderline. Read it alongside ferritin and transferrin saturation, and review the full panel with a clinician before acting.',
      normal:
        'Your serum iron is in a healthy range. Maintain a balanced diet and keep an eye on the wider iron panel at routine bloods.',
      great:
        'Your serum iron is in a strong band, consistent with good iron status. Maintain your current diet.',
      elite:
        'Your serum iron is excellent within the full panel context. Sustain your balanced diet.',
    }),
  },
  tibc: {
    definition:
      'Total iron-binding capacity (TIBC) reflects how much iron your blood could carry — essentially the number of available transport seats on the protein transferrin.',
    impact:
      'TIBC rises when iron stores are low and falls when they are high, so it helps distinguish the cause of an abnormal iron reading. It is always read with the rest of the iron panel.',
    coachInsights: bothGenders({
      poor: 'Your TIBC is outside the expected band, which is informative only alongside iron and ferritin. Review the full iron panel with a clinician to understand what is driving it.',
      cautious:
        'Your TIBC is borderline. It is best interpreted with ferritin and serum iron, so review the panel as a set with a clinician.',
      normal:
        'Your TIBC is in a typical range, consistent with balanced iron status. No action needed beyond routine monitoring.',
      great:
        'Your TIBC sits comfortably within the iron panel picture. Maintain your current diet.',
      elite:
        'Your TIBC is well within range alongside your other iron markers. Sustain your balanced diet.',
    }),
  },
  transferrin_sat: {
    definition:
      'Transferrin saturation is the percentage of your blood’s iron-carrying capacity that is actually filled with iron. It is one of the clearer single reads on iron availability.',
    impact:
      'Low saturation can point toward iron deficiency, while high saturation may suggest iron overload. Both are worth understanding within the full panel.',
    coachInsights: bothGenders({
      poor: 'Your transferrin saturation is outside the healthy band. Whether it is low or high changes the action entirely, so review the full iron panel with a clinician before supplementing or changing diet.',
      cautious:
        'Your transferrin saturation is borderline. Interpret it with iron, ferritin and TIBC, and review the set with a clinician.',
      normal:
        'Your transferrin saturation is in a healthy range, a good sign of balanced iron availability. Maintain your current diet.',
      great:
        'Your transferrin saturation is in a strong band. Iron availability looks well balanced; keep your diet as is.',
      elite:
        'Your transferrin saturation is excellent within the panel context. Sustain your balanced diet.',
    }),
  },
  ferritin: {
    definition:
      'Ferritin reflects your body’s stored iron — the reserve tank rather than the iron circulating right now. It is one of the most useful single markers of iron status.',
    impact:
      'Low ferritin can cause fatigue and reduced exercise capacity even before anaemia appears; very high ferritin can signal overload or inflammation. Context from the wider panel matters.',
    coachInsights: bothGenders({
      poor: 'Your ferritin is outside the healthy band. If low, it points to depleted iron stores — common in heavy trainers and worth addressing with diet and possibly supplementation under a clinician. If high, review for inflammation or overload. Either way, discuss the full panel.',
      cautious:
        'Your ferritin is borderline. If trending low, lean into iron-rich foods (red meat, legumes, leafy greens with vitamin C) and recheck; if high-borderline, review with a clinician.',
      normal:
        'Your ferritin is in a healthy range, indicating adequate iron stores. Maintain a balanced, iron-aware diet.',
      great:
        'Your ferritin is in a strong band, a good reserve for training and energy. Keep your current diet.',
      elite:
        'Your ferritin sits in an excellent band within the panel context. Sustain your balanced diet.',
    }),
  },

  // ──────────────────────────────────────────────────────────────────────
  // Thyroid
  // ──────────────────────────────────────────────────────────────────────
  tsh: {
    definition:
      'Thyroid-stimulating hormone (TSH) is the signal from the brain telling the thyroid how much hormone to produce. It is the primary screening marker of thyroid function.',
    impact:
      'TSH moves opposite to thyroid output: it rises when the thyroid is underactive and falls when overactive. It is interpreted with FT3 and FT4 for a fuller picture.',
    coachInsights: bothGenders({
      poor: 'Your TSH is well outside the expected range, which warrants a clinical review with FT3 and FT4 to understand thyroid function. This is a marker to interpret medically rather than through lifestyle alone.',
      cautious:
        'Your TSH is borderline. Read it alongside FT3 and FT4 and review with a clinician, especially if you have symptoms like fatigue, weight or temperature changes.',
      normal:
        'Your TSH is in a healthy range, consistent with normal thyroid signalling. No action needed beyond routine monitoring.',
      great:
        'Your TSH sits comfortably mid-range, a reassuring sign of thyroid balance. Maintain your usual healthy habits.',
      elite:
        'Your TSH is well within range, consistent with steady thyroid function. No action needed.',
    }),
  },
  ft3: {
    definition:
      'Free triiodothyronine (FT3) is the active thyroid hormone that drives metabolism in your cells. It is measured to assess how much usable thyroid hormone is available.',
    impact:
      'FT3 influences energy, temperature and metabolic rate. It is read alongside TSH and FT4 rather than alone, as the markers tell their story together.',
    coachInsights: bothGenders({
      poor: 'Your FT3 is outside the expected band. Interpret it with TSH and FT4 and review with a clinician — thyroid markers are best understood as a set, medically.',
      cautious:
        'Your FT3 is borderline. Read it with TSH and FT4, and discuss with a clinician if you have related symptoms.',
      normal:
        'Your FT3 is in a healthy range, consistent with good thyroid output. No action needed beyond routine monitoring.',
      great:
        'Your FT3 sits comfortably in range, a good sign of metabolic balance. Maintain your usual habits.',
      elite:
        'Your FT3 is well within range alongside your other thyroid markers. No action needed.',
    }),
  },
  ft4: {
    definition:
      'Free thyroxine (FT4) is the main hormone the thyroid releases, later converted to the more active FT3. It reflects the thyroid’s baseline production.',
    impact:
      'FT4 helps clarify whether a thyroid signal abnormality comes from the gland itself. It is interpreted with TSH and FT3 as a panel.',
    coachInsights: bothGenders({
      poor: 'Your FT4 is outside the expected band. Review it with TSH and FT3 and a clinician — thyroid function is interpreted medically as a set.',
      cautious:
        'Your FT4 is borderline. Read it with TSH and FT3 and discuss with a clinician if symptoms are present.',
      normal:
        'Your FT4 is in a healthy range, consistent with normal thyroid production. No action needed beyond routine monitoring.',
      great:
        'Your FT4 sits comfortably in range. Maintain your usual healthy habits.',
      elite:
        'Your FT4 is well within range alongside your other thyroid markers. No action needed.',
    }),
  },
  tgab: {
    definition:
      'Thyroglobulin antibodies (TgAb) are immune proteins that, when raised, can indicate the immune system is reacting to thyroid tissue. They are an autoimmune-context marker.',
    impact:
      'Raised TgAb does not by itself mean thyroid dysfunction, but it adds context to thyroid function tests and may warrant ongoing monitoring.',
    coachInsights: bothGenders({
      poor: 'Your TgAb is raised, suggesting some autoimmune thyroid activity. This is context rather than a diagnosis — review it with your TSH/FT3/FT4 and a clinician, who may recommend periodic monitoring.',
      cautious:
        'Your TgAb is mildly elevated. Discuss it with a clinician alongside your thyroid function tests; it often simply means worth keeping an eye on.',
      normal:
        'Your TgAb is in the normal range, with no sign of antibody activity against thyroid tissue. No action needed.',
      great:
        'Your TgAb is low, a reassuring sign on the autoimmune side. No action needed.',
      elite:
        'Your TgAb is very low, consistent with no autoimmune thyroid activity. No action needed.',
    }),
  },
  tpo: {
    definition:
      'Thyroperoxidase antibodies (TPOAb) target an enzyme the thyroid uses to make hormone. Raised levels are the most common marker of autoimmune thyroid involvement.',
    impact:
      'Elevated TPOAb adds autoimmune context to thyroid results and can flag a higher chance of future thyroid changes, making monitoring sensible.',
    coachInsights: bothGenders({
      poor: 'Your TPOAb is raised, indicating autoimmune thyroid activity. This is context, not a diagnosis — review alongside your thyroid function and a clinician, who may suggest periodic monitoring of TSH.',
      cautious:
        'Your TPOAb is mildly elevated. Discuss with a clinician alongside your thyroid panel; ongoing monitoring is often all that is needed.',
      normal:
        'Your TPOAb is in the normal range, with no sign of antibody activity. No action needed.',
      great:
        'Your TPOAb is low, a reassuring autoimmune-context result. No action needed.',
      elite:
        'Your TPOAb is very low, consistent with no autoimmune thyroid activity. No action needed.',
    }),
  },

  // ──────────────────────────────────────────────────────────────────────
  // Hormones
  // ──────────────────────────────────────────────────────────────────────
  total_testosterone: {
    definition:
      'Total testosterone measures the full amount of this key hormone in the blood, including the portion bound to proteins. It influences muscle and bone, fat distribution, drive, mood and energy.',
    impact:
      'Healthy levels support lean muscle, metabolic health, cognition and overall vitality. Persistently low testosterone can track with fatigue, lost muscle and bone, more visceral fat and low mood.',
    coachInsights: {
      poor: {
        male: 'Your total testosterone sits in the Attention range for your age and sex — worth getting ahead of proactively rather than waiting for symptoms to build. Resistance-train 3–4×/week, protect 7–9 hours of sleep, reduce visceral fat (the single biggest reversible driver in men), and ensure adequate vitamin D, zinc and healthy fats. Re-test in 8–12 weeks; if still low, we will refer for a clinical work-up (LH, FSH, SHBG).',
        female:
          'Your testosterone is low for your age and sex. In women, testosterone still supports libido, muscle and mood, so it is worth understanding. Focus on resistance training, sleep and stress management, and review with a clinician, as causes in women differ. Re-test after a consistent block.',
      },
      cautious: {
        male: 'Your testosterone is mildly below the optimal band. Lean into resistance training, sleep quality and reducing visceral fat — these move it fastest in men — and recheck after 8–12 weeks.',
        female:
          'Your testosterone is mildly below the optimal band for women. Resistance training, sleep and stress management help; recheck after a consistent block and review with a clinician if symptoms persist.',
      },
      normal: {
        male: 'Your testosterone is in a healthy range. Maintain the strength training, sleep and body-composition habits supporting it.',
        female:
          'Your testosterone is in a healthy range for women. Maintain your training, sleep and stress habits.',
      },
      great: {
        male: 'Your testosterone is in a strong band, supporting muscle, drive and recovery. Keep up the training and recovery habits behind it.',
        female:
          'Your testosterone is in a strong band for women, supporting muscle and vitality. Keep the habits that are working.',
      },
      elite: {
        male: 'Your testosterone is excellent. This is a genuine asset for strength and recovery; protect your sleep and training consistency to keep it there.',
        female:
          'Your testosterone is in an excellent band for women. Sustain the training and recovery habits supporting it.',
      },
    },
  },
  free_testosterone: {
    definition:
      'Free testosterone is the unbound fraction of testosterone available for your tissues to use right now. It can give a sharper read than total testosterone when binding proteins are unusual.',
    impact:
      'Because it is the usable portion, free testosterone often tracks symptoms more closely. It is interpreted alongside total testosterone and SHBG.',
    coachInsights: {
      poor: {
        male: 'Your free testosterone is low, meaning less usable hormone despite whatever the total shows. Resistance training, sleep, and reducing visceral fat help; review alongside SHBG and total testosterone with a clinician. Re-test after a consistent block.',
        female:
          'Your free testosterone is low. In women this still affects libido, muscle and mood. Review alongside SHBG and total testosterone with a clinician, and support it with resistance training, sleep and stress management.',
      },
      cautious: {
        male: 'Your free testosterone is mildly low. Build strength training, protect sleep, and trim visceral fat; read it with SHBG and total testosterone, and recheck.',
        female:
          'Your free testosterone is mildly low for women. Resistance training and stress management help; interpret with SHBG and total testosterone and recheck.',
      },
      normal: {
        male: 'Your free testosterone is in a healthy range. Maintain the strength training and recovery habits supporting it.',
        female:
          'Your free testosterone is in a healthy range for women. Maintain your training and recovery habits.',
      },
      great: {
        male: 'Your free testosterone is in a strong band — plenty of usable hormone for muscle and recovery. Keep it up.',
        female:
          'Your free testosterone is in a strong band for women. Sustain the habits behind it.',
      },
      elite: {
        male: 'Your free testosterone is excellent, a real asset for strength and drive. Protect sleep and training consistency.',
        female:
          'Your free testosterone is excellent for women. Maintain the routine supporting it.',
      },
    },
  },
  oestradiol: {
    definition:
      'Oestradiol (E2) is the main form of oestrogen, central to reproductive health and also important for bone, mood and cardiovascular function in both sexes.',
    impact:
      'Oestradiol needs to sit in a balanced range — too low or too high each carry different effects. Its ideal level differs substantially by sex and life stage.',
    coachInsights: {
      poor: {
        male: 'Your oestradiol is outside the healthy band for men, where balance with testosterone matters. Review it alongside testosterone and SHBG with a clinician — managing body fat helps, as fat tissue converts testosterone to oestrogen.',
        female:
          'Your oestradiol is outside the expected band, which in women depends heavily on cycle phase and life stage. Review it in that context with a clinician rather than acting on the number alone.',
      },
      cautious: {
        male: 'Your oestradiol is borderline for men. Read it alongside testosterone, manage body fat, and review with a clinician if it stays off.',
        female:
          'Your oestradiol is borderline, but interpretation in women depends on cycle timing and life stage. Discuss it in context with a clinician.',
      },
      normal: {
        male: 'Your oestradiol is in a healthy range for men, balanced with your other hormones. Maintain your current habits and body composition.',
        female:
          'Your oestradiol is within an expected range for your context. Maintain your usual healthy habits.',
      },
      great: {
        male: 'Your oestradiol sits in a favourable band relative to your other hormones. Keep your current habits.',
        female:
          'Your oestradiol is in a favourable range for your context. Maintain your healthy routine.',
      },
      elite: {
        male: 'Your oestradiol is well balanced with your hormonal profile. No action needed beyond your usual habits.',
        female:
          'Your oestradiol sits comfortably within an expected range. No action needed.',
      },
    },
  },
  shbg: {
    definition:
      'Sex hormone-binding globulin (SHBG) is a protein that binds sex hormones and controls how much is free for tissues to use. It is key context for interpreting testosterone and oestradiol.',
    impact:
      'High SHBG leaves less free hormone available; low SHBG can accompany metabolic issues. It is read together with your sex hormones rather than alone.',
    coachInsights: bothGenders({
      poor: 'Your SHBG is outside the expected band, which changes how your sex hormones should be read. Interpret it alongside testosterone and oestradiol with a clinician — low SHBG can accompany insulin resistance, so the metabolic picture is worth reviewing.',
      cautious:
        'Your SHBG is borderline. Read it with your sex hormones, and if it is on the low side, address the metabolic markers (glucose, insulin) that often travel with it.',
      normal:
        'Your SHBG is in a healthy range, giving a clean read on your free hormone levels. Maintain your current habits.',
      great:
        'Your SHBG sits in a favourable band relative to your hormones. Keep your metabolic and training habits steady.',
      elite:
        'Your SHBG is well placed within your hormonal picture. No action needed beyond your usual routine.',
    }),
  },
  cortisol: {
    definition:
      'Cortisol is the body’s main stress hormone, following a daily rhythm that is high in the morning and low at night. It helps regulate energy, blood sugar and the stress response.',
    impact:
      'Healthy cortisol rhythm supports energy and recovery; chronically high or dysregulated cortisol can affect sleep, body composition and mood. Timing of the sample matters.',
    coachInsights: bothGenders({
      poor: 'Your cortisol is outside the expected band, but timing strongly affects this result. Confirm when the sample was taken (morning is standard) and review with a clinician. Meanwhile, protect sleep, manage stress load, and avoid over-training.',
      cautious:
        'Your cortisol is borderline. Check the sample timing, then focus on sleep, stress management and balanced training load. Recheck a morning sample if needed.',
      normal:
        'Your cortisol is in a healthy range for the time sampled. Maintain your sleep and stress-management habits.',
      great:
        'Your cortisol sits in a healthy band, consistent with good stress regulation. Keep protecting sleep and recovery.',
      elite:
        'Your cortisol is well regulated. Sustain the sleep, training balance and stress habits behind it.',
    }),
  },
  dheas: {
    definition:
      'DHEA-sulphate (DHEAS) is a hormone made by the adrenal glands and a building block for other sex hormones. It tends to decline gradually with age.',
    impact:
      'DHEAS gives context on adrenal output and the broader hormonal picture. Low levels can accompany ageing and stress; it is interpreted alongside other hormones.',
    coachInsights: bothGenders({
      poor: 'Your DHEAS is low, which can reflect ageing, chronic stress or adrenal output. Review it alongside your other hormones with a clinician, and support it indirectly through sleep, stress management and not over-training.',
      cautious:
        'Your DHEAS is mildly low. Read it in context with your other hormones, and focus on recovery, sleep and stress load.',
      normal:
        'Your DHEAS is in a healthy range for your age. Maintain your usual recovery and stress habits.',
      great:
        'Your DHEAS is in a strong band, a good sign of hormonal reserve. Keep your recovery habits steady.',
      elite:
        'Your DHEAS is excellent for your age. Sustain the sleep and stress habits supporting it.',
    }),
  },
  igf1: {
    definition:
      'Insulin-like growth factor 1 (IGF-1) is produced mainly in the liver in response to growth hormone. It reflects growth-hormone activity and supports tissue repair and muscle.',
    impact:
      'IGF-1 needs to sit in a balanced range — both ends carry trade-offs. It is interpreted in the context of age, training and overall health.',
    coachInsights: bothGenders({
      poor: 'Your IGF-1 is outside the expected band. As both low and high have implications, interpret it in context with a clinician rather than chasing the number. Sleep quality and protein adequacy support healthy levels.',
      cautious:
        'Your IGF-1 is borderline. Read it in the context of your age and training, and support it through quality sleep, protein adequacy and consistent strength work.',
      normal:
        'Your IGF-1 is in a healthy range for your age. Maintain your sleep, nutrition and training habits.',
      great:
        'Your IGF-1 is in a favourable band, consistent with good repair capacity. Keep your training and recovery steady.',
      elite:
        'Your IGF-1 sits in a strong band for your age. Sustain the sleep, protein and training habits behind it.',
    }),
  },
  fsh: {
    definition:
      'Follicle-stimulating hormone (FSH) is a pituitary hormone that regulates reproductive function — egg development in women and sperm production in men.',
    impact:
      'FSH levels carry very different meaning by sex and life stage. In women it varies across the cycle and rises around menopause; in men it gives context on testicular function.',
    coachInsights: {
      poor: {
        male: 'Your FSH is outside the expected band for men, which is context for testicular function. Review it alongside testosterone and LH with a clinician.',
        female:
          'Your FSH is outside the expected band, but in women this depends heavily on cycle phase and life stage (it rises around menopause). Interpret it in that context with a clinician.',
      },
      cautious: {
        male: 'Your FSH is borderline for men. Read it with LH and testosterone, and review with a clinician if it stays off.',
        female:
          'Your FSH is borderline, but cycle timing and life stage strongly affect it. Discuss it in context with a clinician.',
      },
      normal: {
        male: 'Your FSH is in a healthy range for men, consistent with normal reproductive signalling. No action needed.',
        female:
          'Your FSH is within an expected range for your context. No action needed beyond routine review.',
      },
      great: {
        male: 'Your FSH sits comfortably in range. No action needed.',
        female:
          'Your FSH is well placed for your context. No action needed.',
      },
      elite: {
        male: 'Your FSH is well within range, consistent with normal function. No action needed.',
        female:
          'Your FSH sits comfortably within an expected range. No action needed.',
      },
    },
  },
  lh: {
    definition:
      'Luteinising hormone (LH) is a pituitary hormone that triggers ovulation in women and stimulates testosterone production in men. It works in concert with FSH.',
    impact:
      'Like FSH, LH carries different meaning by sex and life stage. It is most informative read alongside the sex hormones it regulates.',
    coachInsights: {
      poor: {
        male: 'Your LH is outside the expected band for men, which is context for testosterone production. Review it with testosterone and FSH and a clinician.',
        female:
          'Your LH is outside the expected band, but in women it varies sharply across the cycle and life stage. Interpret it in that context with a clinician.',
      },
      cautious: {
        male: 'Your LH is borderline for men. Read it with FSH and testosterone, and review if it stays off.',
        female:
          'Your LH is borderline, but cycle timing strongly affects it. Discuss it in context with a clinician.',
      },
      normal: {
        male: 'Your LH is in a healthy range for men, consistent with normal hormonal signalling. No action needed.',
        female:
          'Your LH is within an expected range for your context. No action needed beyond routine review.',
      },
      great: {
        male: 'Your LH sits comfortably in range. No action needed.',
        female:
          'Your LH is well placed for your context. No action needed.',
      },
      elite: {
        male: 'Your LH is well within range, consistent with normal function. No action needed.',
        female:
          'Your LH sits comfortably within an expected range. No action needed.',
      },
    },
  },
  prolactin: {
    definition:
      'Prolactin is a pituitary hormone best known for its role in milk production, but it is present in everyone and influences reproductive hormones.',
    impact:
      'Raised prolactin can suppress other reproductive hormones and is occasionally linked to medications, stress or pituitary issues. It is interpreted with the rest of the hormonal picture.',
    coachInsights: bothGenders({
      poor: 'Your prolactin is raised. Causes range from stress and certain medications to less common pituitary issues, so review it with a clinician alongside your other hormones rather than acting on it alone. A repeat sample is often the first step.',
      cautious:
        'Your prolactin is mildly raised. Note any medications and stress around the test, and review with a clinician — a repeat sample often clarifies it.',
      normal:
        'Your prolactin is in a healthy range, with no suppressive effect on your other hormones. No action needed.',
      great:
        'Your prolactin sits comfortably in range. No action needed.',
      elite:
        'Your prolactin is well within range, consistent with normal hormonal balance. No action needed.',
    }),
  },
  progesterone: {
    definition:
      'Progesterone is a hormone central to the menstrual cycle and pregnancy in women, present in smaller amounts in men. Its level in women depends heavily on cycle phase.',
    impact:
      'Progesterone supports the second half of the menstrual cycle and reproductive health. Interpreting it requires knowing where in the cycle a woman is.',
    coachInsights: {
      poor: {
        male: 'Your progesterone is outside the typical low range expected in men. This is unusual context worth reviewing with a clinician alongside your other hormones.',
        female:
          'Your progesterone is outside the expected band, but in women this depends entirely on cycle timing. Interpret it relative to where you are in your cycle, with a clinician.',
      },
      cautious: {
        male: 'Your progesterone is borderline for men. Review it in context with your other hormones if it stays unusual.',
        female:
          'Your progesterone is borderline, but cycle phase strongly affects it. Discuss it in context with a clinician.',
      },
      normal: {
        male: 'Your progesterone is in the expected low range for men. No action needed.',
        female:
          'Your progesterone is within an expected range for your cycle context. No action needed beyond routine review.',
      },
      great: {
        male: 'Your progesterone sits in the expected range for men. No action needed.',
        female:
          'Your progesterone is well placed for your cycle context. No action needed.',
      },
      elite: {
        male: 'Your progesterone is well within the expected range for men. No action needed.',
        female:
          'Your progesterone sits comfortably within an expected range for your context. No action needed.',
      },
    },
  },

  // ──────────────────────────────────────────────────────────────────────
  // Full Blood Count
  // ──────────────────────────────────────────────────────────────────────
  hemoglobin: {
    definition:
      'Haemoglobin is the protein in red blood cells that carries oxygen from the lungs to the rest of the body. It is a core measure of the blood’s oxygen-carrying capacity.',
    impact:
      'Low haemoglobin can cause fatigue and reduced exercise capacity; high levels are also worth understanding. Healthy ranges differ between men and women.',
    coachInsights: {
      poor: {
        male: 'Your haemoglobin is outside the healthy band for men. If low, it can cause fatigue and reduced performance — review iron status and possible causes with a clinician. If high, that also warrants medical review.',
        female:
          'Your haemoglobin is outside the healthy band for women. If low, check iron status (women have higher iron demands) and review causes with a clinician. Either direction warrants follow-up.',
      },
      cautious: {
        male: 'Your haemoglobin is borderline for men. Read it alongside your iron panel and recheck; review with a clinician if symptoms like fatigue are present.',
        female:
          'Your haemoglobin is borderline for women. Check iron status and recheck, and review with a clinician if you feel fatigued.',
      },
      normal: {
        male: 'Your haemoglobin is in a healthy range for men, good oxygen-carrying capacity. Maintain a balanced, iron-aware diet.',
        female:
          'Your haemoglobin is in a healthy range for women. Maintain a balanced, iron-aware diet.',
      },
      great: {
        male: 'Your haemoglobin is in a strong band for men. Keep your diet and training as they are.',
        female:
          'Your haemoglobin is in a strong band for women. Maintain your current diet.',
      },
      elite: {
        male: 'Your haemoglobin is excellent for men, supporting strong oxygen delivery. Sustain your balanced diet.',
        female:
          'Your haemoglobin is excellent for women. Sustain your balanced, iron-aware diet.',
      },
    },
  },
  rbc: {
    definition:
      'Red blood cell (RBC) count measures how many oxygen-carrying cells are in your blood. It works together with haemoglobin and haematocrit to describe oxygen transport.',
    impact:
      'Both low and high RBC counts carry meaning, and the healthy range differs by sex. It is interpreted alongside haemoglobin and haematocrit.',
    coachInsights: {
      poor: {
        male: 'Your RBC count is outside the healthy band for men. Read it with haemoglobin and haematocrit and review the cause with a clinician — both low and high counts warrant follow-up.',
        female:
          'Your RBC count is outside the healthy band for women. Interpret it alongside haemoglobin and haematocrit and review with a clinician.',
      },
      cautious: {
        male: 'Your RBC count is borderline for men. Read it with the rest of the blood count and recheck if needed.',
        female:
          'Your RBC count is borderline for women. Read it with haemoglobin and haematocrit and recheck if needed.',
      },
      normal: {
        male: 'Your RBC count is in a healthy range for men. No action needed beyond routine monitoring.',
        female:
          'Your RBC count is in a healthy range for women. No action needed beyond routine monitoring.',
      },
      great: {
        male: 'Your RBC count sits in a strong band for men. Maintain your current habits.',
        female:
          'Your RBC count sits in a strong band for women. Maintain your current habits.',
      },
      elite: {
        male: 'Your RBC count is excellent for men within the blood-count picture. No action needed.',
        female:
          'Your RBC count is excellent for women within the blood-count picture. No action needed.',
      },
    },
  },
  hematocrit: {
    definition:
      'Haematocrit is the percentage of your blood made up of red blood cells. It is a measure of blood thickness and oxygen-carrying capacity, read with haemoglobin and RBC count.',
    impact:
      'Low haematocrit can accompany anaemia; high haematocrit can make blood thicker. Healthy ranges differ between men and women.',
    coachInsights: {
      poor: {
        male: 'Your haematocrit is outside the healthy band for men. Read it with haemoglobin and RBC count and review the cause with a clinician — both directions warrant follow-up.',
        female:
          'Your haematocrit is outside the healthy band for women. Interpret it with the rest of the blood count and review with a clinician.',
      },
      cautious: {
        male: 'Your haematocrit is borderline for men. Read it alongside haemoglobin and recheck if needed.',
        female:
          'Your haematocrit is borderline for women. Read it with haemoglobin and recheck if needed.',
      },
      normal: {
        male: 'Your haematocrit is in a healthy range for men. No action needed beyond routine monitoring.',
        female:
          'Your haematocrit is in a healthy range for women. No action needed beyond routine monitoring.',
      },
      great: {
        male: 'Your haematocrit sits in a strong band for men. Maintain hydration and your current habits.',
        female:
          'Your haematocrit sits in a strong band for women. Maintain hydration and your current habits.',
      },
      elite: {
        male: 'Your haematocrit is excellent for men within the blood-count picture. No action needed.',
        female:
          'Your haematocrit is excellent for women within the blood-count picture. No action needed.',
      },
    },
  },
  wbc: {
    definition:
      'White blood cell (WBC) count measures the immune cells in your blood. It rises during infection and inflammation and gives a general read on immune activity.',
    impact:
      'A high WBC count often reflects a current infection; a low count can have several causes. It is a snapshot and best read in context of how you feel and other markers.',
    coachInsights: bothGenders({
      poor: 'Your WBC count is outside the healthy band. If high, a recent or current infection is the most common cause — recheck once well. If persistently abnormal in either direction, review with a clinician.',
      cautious:
        'Your WBC count is borderline. Note any recent illness around the test and recheck when fully recovered.',
      normal:
        'Your WBC count is in a healthy range, consistent with normal immune activity. No action needed.',
      great:
        'Your WBC count sits comfortably in range. No action needed.',
      elite:
        'Your WBC count is well within range, consistent with a settled immune system. No action needed.',
    }),
  },
  platelet: {
    definition:
      'Platelets are small cell fragments that help your blood clot. The platelet count shows how many are circulating to support normal clotting.',
    impact:
      'Both low and high platelet counts carry meaning for clotting and are worth understanding. A single reading is interpreted alongside the rest of the blood count.',
    coachInsights: bothGenders({
      poor: 'Your platelet count is outside the healthy band. Both low and high counts warrant a clinical review to understand the cause; read it alongside the full blood count.',
      cautious:
        'Your platelet count is borderline. Recheck and read it with the rest of the blood count; review with a clinician if it stays off.',
      normal:
        'Your platelet count is in a healthy range, consistent with normal clotting. No action needed.',
      great:
        'Your platelet count sits comfortably in range. No action needed.',
      elite:
        'Your platelet count is well within range. No action needed.',
    }),
  },
  mcv: {
    definition:
      'Mean corpuscular volume (MCV) is the average size of your red blood cells. It helps characterise the type of any anaemia and points toward likely nutritional causes.',
    impact:
      'Smaller-than-usual cells can suggest iron deficiency; larger cells can suggest low B12 or folate. MCV is a clue read with the rest of the blood count.',
    coachInsights: bothGenders({
      poor: 'Your MCV is outside the expected band. It is a clue to cause rather than a problem itself — small cells hint at iron issues, large cells at B12 or folate. Review it with your iron and B-vitamin status and a clinician.',
      cautious:
        'Your MCV is borderline. Read it alongside your iron, B12 and folate results to understand the direction, and recheck if needed.',
      normal:
        'Your MCV is in a healthy range, consistent with normal red cell size. No action needed.',
      great:
        'Your MCV sits comfortably in range. No action needed.',
      elite:
        'Your MCV is well within range, consistent with healthy red cells. No action needed.',
    }),
  },
  mch: {
    definition:
      'Mean corpuscular haemoglobin (MCH) is the average amount of haemoglobin inside each red blood cell. It works with MCV to characterise red cells.',
    impact:
      'Low MCH can accompany iron deficiency. Like MCV, it is a supporting clue read with the full blood count rather than acted on alone.',
    coachInsights: bothGenders({
      poor: 'Your MCH is outside the expected band. It is a supporting clue — low values often accompany iron deficiency. Review it with your iron panel and MCV, and a clinician if needed.',
      cautious:
        'Your MCH is borderline. Read it alongside MCV and your iron status, and recheck if needed.',
      normal:
        'Your MCH is in a healthy range, consistent with normal red cells. No action needed.',
      great:
        'Your MCH sits comfortably in range. No action needed.',
      elite:
        'Your MCH is well within range. No action needed.',
    }),
  },

  // ──────────────────────────────────────────────────────────────────────
  // Kidney & Electrolytes
  // ──────────────────────────────────────────────────────────────────────
  creatinine: {
    definition:
      'Creatinine is a waste product from normal muscle metabolism that the kidneys filter out. Its blood level is a standard read on how well the kidneys are clearing waste.',
    impact:
      'Creatinine is used to estimate kidney filtration. It can be nudged up by high muscle mass or recent intense exercise, so context matters; it is read with eGFR.',
    coachInsights: bothGenders({
      poor: 'Your creatinine is outside the healthy band. In very muscular or recently hard-training people this can be mildly high without a kidney issue, but it should be confirmed and read with eGFR by a clinician. Stay well hydrated and recheck rested.',
      cautious:
        'Your creatinine is borderline. Hydration and recent heavy training can affect it, so recheck rested and read it alongside eGFR.',
      normal:
        'Your creatinine is in a healthy range, consistent with good kidney clearance. Maintain good hydration.',
      great:
        'Your creatinine sits comfortably in range alongside a healthy eGFR. Keep hydrating well.',
      elite:
        'Your creatinine is well within range with good kidney function. Sustain your hydration habits.',
    }),
  },
  egfr: {
    definition:
      'Estimated glomerular filtration rate (eGFR) is a calculation of how well your kidneys filter blood, based on creatinine, age and other factors. It is the headline kidney-function number.',
    impact:
      'A higher eGFR generally reflects better kidney filtration. Lower values are worth monitoring and understanding, ideally with repeat testing.',
    coachInsights: bothGenders({
      poor: 'Your eGFR is in the Attention range, suggesting reduced kidney filtration. Confirm with a repeat test (it can be affected by hydration and recent protein intake) and review with a clinician. Stay well hydrated and avoid unnecessary high-dose supplements.',
      cautious:
        'Your eGFR is mildly below the optimal band. Recheck after good hydration and review with a clinician if it persists; keep an eye on blood pressure and glucose, which influence kidney health.',
      normal:
        'Your eGFR is in a healthy range, consistent with good kidney function. Maintain hydration and healthy blood pressure.',
      great:
        'Your eGFR is in a strong band. Keep up the hydration and blood-pressure habits supporting your kidneys.',
      elite:
        'Your eGFR is excellent, reflecting strong kidney filtration. Sustain your healthy habits.',
    }),
  },
  bun: {
    definition:
      'Blood urea nitrogen (BUN) measures a waste product from protein breakdown that the kidneys clear. It gives additional context on kidney function and hydration.',
    impact:
      'BUN can rise with dehydration or high protein intake as well as kidney issues, so it is read alongside creatinine and eGFR rather than alone.',
    coachInsights: bothGenders({
      poor: 'Your BUN is outside the expected band. Dehydration and very high protein intake can raise it independently of kidney function, so rehydrate, read it with creatinine and eGFR, and review with a clinician if it persists.',
      cautious:
        'Your BUN is borderline. Check hydration and recent protein intake, recheck, and read it alongside creatinine and eGFR.',
      normal:
        'Your BUN is in a healthy range, consistent with good hydration and kidney clearance. Maintain hydration.',
      great:
        'Your BUN sits comfortably in range. Keep hydrating well.',
      elite:
        'Your BUN is well within range alongside good kidney markers. Sustain your hydration.',
    }),
  },
  sodium: {
    definition:
      'Sodium is an electrolyte that controls fluid balance and is essential for nerve and muscle function. The body keeps blood sodium within a tight range.',
    impact:
      'Sodium imbalances usually reflect fluid balance rather than salt intake and can affect how you feel. The body normally regulates it closely.',
    coachInsights: bothGenders({
      poor: 'Your sodium is outside the tightly regulated range, which usually reflects fluid balance rather than salt intake. Recheck and review with a clinician, especially if you have been unwell or doing very long endurance sessions.',
      cautious:
        'Your sodium is borderline. It is closely tied to hydration status, so review your fluid intake around the test and recheck.',
      normal:
        'Your sodium is in the healthy range, consistent with good fluid balance. No action needed.',
      great:
        'Your sodium sits comfortably in range. Maintain sensible hydration.',
      elite:
        'Your sodium is well regulated. No action needed.',
    }),
  },
  potassium: {
    definition:
      'Potassium is an electrolyte essential for heart rhythm, nerve signals and muscle contraction. The body keeps it within a narrow, carefully controlled range.',
    impact:
      'Both low and high potassium affect heart and muscle function, which is why the body regulates it tightly. Abnormal results are worth confirming and understanding.',
    coachInsights: bothGenders({
      poor: 'Your potassium is outside the narrow healthy range, which matters for heart and muscle function. Sometimes the sample handling itself causes an odd reading, so recheck and review with a clinician.',
      cautious:
        'Your potassium is borderline. Recheck to rule out a sample issue, and review with a clinician if it stays off.',
      normal:
        'Your potassium is in the healthy range, consistent with normal heart and muscle function. No action needed.',
      great:
        'Your potassium sits comfortably in range. Maintain a balanced, vegetable-rich diet.',
      elite:
        'Your potassium is well regulated. No action needed.',
    }),
  },
  chloride: {
    definition:
      'Chloride is an electrolyte that works with sodium to maintain fluid balance and the body’s acid–base status. It is part of the standard electrolyte panel.',
    impact:
      'Chloride shifts usually mirror changes in fluid and acid–base balance. It is interpreted alongside sodium, potassium and bicarbonate.',
    coachInsights: bothGenders({
      poor: 'Your chloride is outside the expected band, which usually reflects fluid or acid–base balance rather than diet. Read it with the rest of the electrolyte panel and review with a clinician if it persists.',
      cautious:
        'Your chloride is borderline. Read it alongside sodium and bicarbonate, check hydration, and recheck if needed.',
      normal:
        'Your chloride is in the healthy range, consistent with balanced electrolytes. No action needed.',
      great:
        'Your chloride sits comfortably in range. Maintain sensible hydration.',
      elite:
        'Your chloride is well regulated. No action needed.',
    }),
  },
  bicarbonate: {
    definition:
      'Bicarbonate reflects the body’s acid–base balance and the buffering capacity of the blood. It is part of the standard electrolyte panel.',
    impact:
      'Bicarbonate shifts can indicate changes in breathing, kidney handling or metabolism. It is read alongside the other electrolytes for context.',
    coachInsights: bothGenders({
      poor: 'Your bicarbonate is outside the expected band, signalling a shift in acid–base balance. Read it with the rest of the electrolyte panel and review with a clinician to understand the cause.',
      cautious:
        'Your bicarbonate is borderline. Interpret it alongside the other electrolytes and recheck if needed.',
      normal:
        'Your bicarbonate is in the healthy range, consistent with balanced acid–base status. No action needed.',
      great:
        'Your bicarbonate sits comfortably in range. No action needed.',
      elite:
        'Your bicarbonate is well within range. No action needed.',
    }),
  },

  // ──────────────────────────────────────────────────────────────────────
  // Liver Function
  // ──────────────────────────────────────────────────────────────────────
  alt: {
    definition:
      'Alanine aminotransferase (ALT) is an enzyme concentrated in the liver. When liver cells are stressed, ALT leaks into the blood, making it a sensitive liver marker.',
    impact:
      'Raised ALT can reflect fatty liver, alcohol, certain medications or recent intense exercise. It is a key marker of liver stress and responds to addressing the cause.',
    coachInsights: bothGenders({
      poor: 'Your ALT is in the Attention range, suggesting the liver is under some stress. Common drivers are fatty liver, alcohol and certain medications. Reduce alcohol, address visceral fat, review medications with a clinician, and recheck after a sustained change.',
      cautious:
        'Your ALT is mildly raised. Trim alcohol, work on body composition, and note that recent hard training can also nudge it. Recheck rested after a few weeks of changes.',
      normal:
        'Your ALT is in a healthy range, consistent with a settled liver. Maintain moderate alcohol intake and a healthy weight.',
      great:
        'Your ALT is in a strong band. Keep the alcohol and body-composition habits supporting your liver.',
      elite:
        'Your ALT is excellent, reflecting low liver stress. Sustain your current habits.',
    }),
  },
  ast: {
    definition:
      'Aspartate aminotransferase (AST) is an enzyme found in the liver and also in muscle. It rises with liver stress and, separately, after intense exercise.',
    impact:
      'Because AST is in muscle too, a raised level in an active person can reflect training rather than the liver. It is read alongside ALT for clarity.',
    coachInsights: bothGenders({
      poor: 'Your AST is in the Attention range. Since AST is also in muscle, recent hard training can raise it — recheck rested. If it stays high alongside ALT, address liver-related drivers (alcohol, visceral fat) and review with a clinician.',
      cautious:
        'Your AST is mildly raised. Recheck after a few rest days to separate training effect from liver stress, and read it with ALT.',
      normal:
        'Your AST is in a healthy range, consistent with a settled liver. Maintain your current habits.',
      great:
        'Your AST is in a strong band. Keep your alcohol and recovery habits steady.',
      elite:
        'Your AST is excellent. Sustain your current habits.',
    }),
  },
  alp: {
    definition:
      'Alkaline phosphatase (ALP) is an enzyme found in the liver, bones and other tissues. Its level gives context on both liver and bone activity.',
    impact:
      'ALP can rise with liver, bile-duct or bone activity, and is naturally higher in growing adolescents. Interpretation depends on the broader picture.',
    coachInsights: bothGenders({
      poor: 'Your ALP is outside the expected band. As it comes from both liver and bone, the cause needs context — review it with your other liver markers and a clinician to identify the source.',
      cautious:
        'Your ALP is borderline. Read it alongside ALT, AST and GGT, and review with a clinician if it persists.',
      normal:
        'Your ALP is in a healthy range, consistent with normal liver and bone activity. No action needed.',
      great:
        'Your ALP sits comfortably in range. No action needed.',
      elite:
        'Your ALP is well within range. No action needed.',
    }),
  },
  ggt: {
    definition:
      'Gamma-glutamyl transferase (GGT) is a liver enzyme particularly sensitive to alcohol and bile-duct activity. It often rises before other liver markers.',
    impact:
      'Raised GGT frequently reflects alcohol intake or fatty liver and is an early, sensitive signal of liver stress. It tends to respond to lifestyle change.',
    coachInsights: bothGenders({
      poor: 'Your GGT is in the Attention range, often an early sign of alcohol load or fatty liver. Reducing alcohol is the most direct lever; address visceral fat too, and recheck after a sustained dry-er period. Review with a clinician if it stays high.',
      cautious:
        'Your GGT is mildly raised. Cut back on alcohol and work on body composition — GGT often responds quickly. Recheck after a few weeks.',
      normal:
        'Your GGT is in a healthy range, consistent with a settled liver. Maintain moderate alcohol intake.',
      great:
        'Your GGT is in a strong band. Keep the alcohol and body-composition habits supporting it.',
      elite:
        'Your GGT is excellent, reflecting low liver stress. Sustain your current habits.',
    }),
  },
  bilirubin: {
    definition:
      'Total bilirubin is a yellow pigment produced when old red blood cells are broken down and processed by the liver. It gives context on liver and red-cell turnover.',
    impact:
      'Mildly raised bilirubin is often harmless and can be a benign inherited pattern; larger changes are read alongside the rest of the liver panel.',
    coachInsights: bothGenders({
      poor: 'Your bilirubin is outside the expected band. Mild elevations are frequently harmless (a common benign inherited pattern), but read it with the rest of the liver panel and review with a clinician to be sure of the cause.',
      cautious:
        'Your bilirubin is borderline. It is often a benign finding; read it alongside ALT, AST and GGT and recheck if needed.',
      normal:
        'Your bilirubin is in a healthy range, consistent with normal liver and red-cell processing. No action needed.',
      great:
        'Your bilirubin sits comfortably in range. No action needed.',
      elite:
        'Your bilirubin is well within range. No action needed.',
    }),
  },
  albumin: {
    definition:
      'Albumin is the main protein the liver makes, helping maintain fluid balance and carry substances in the blood. It reflects liver synthesis and nutritional status.',
    impact:
      'Low albumin can reflect liver function, inflammation or nutrition; it is interpreted alongside the broader picture. Healthy levels support fluid balance and transport.',
    coachInsights: bothGenders({
      poor: 'Your albumin is outside the expected band. Causes range from inflammation to nutrition and liver function, so review it in context with a clinician rather than acting on the number alone. Ensure adequate protein intake.',
      cautious:
        'Your albumin is borderline. Read it alongside your liver and inflammation markers, ensure good protein intake, and recheck if needed.',
      normal:
        'Your albumin is in a healthy range, consistent with good liver synthesis and nutrition. Maintain adequate protein intake.',
      great:
        'Your albumin sits comfortably in range. Keep your protein intake and diet quality up.',
      elite:
        'Your albumin is well within range. Sustain your balanced diet.',
    }),
  },
  total_protein: {
    definition:
      'Total protein measures the combined albumin and globulin proteins in your blood. It gives a broad read on nutrition, liver function and immune-protein levels.',
    impact:
      'Total protein is a general marker interpreted alongside its components. Abnormal values point toward areas to explore rather than a specific issue.',
    coachInsights: bothGenders({
      poor: 'Your total protein is outside the expected band. As a broad marker, it points toward an area to explore rather than a diagnosis — review it with albumin and the rest of the panel and a clinician.',
      cautious:
        'Your total protein is borderline. Read it alongside albumin, ensure adequate protein intake, and recheck if needed.',
      normal:
        'Your total protein is in a healthy range, consistent with good nutrition and liver function. Maintain adequate protein intake.',
      great:
        'Your total protein sits comfortably in range. Keep your diet quality up.',
      elite:
        'Your total protein is well within range. Sustain your balanced diet.',
    }),
  },

  // ──────────────────────────────────────────────────────────────────────
  // Heavy Metals
  // ──────────────────────────────────────────────────────────────────────
  lead: {
    definition:
      'Lead is a heavy metal with no useful role in the body. Exposure can come from old paint, certain occupations, water pipes or contaminated products, and it accumulates over time.',
    impact:
      'Even modest lead exposure is undesirable, as the metal can affect the nervous system and other tissues. The aim is always to keep levels as low as possible by removing exposure.',
    coachInsights: bothGenders({
      poor: 'Your lead is elevated, so the priority is finding and removing the source — old paint, water, occupational or hobby exposure are common. Review the result and likely sources with a clinician, who can guide any further testing.',
      cautious:
        'Your lead is mildly raised. Think through possible sources (home age, occupation, hobbies, water) and discuss with a clinician; the goal is to reduce exposure.',
      normal:
        'Your lead is low, with no sign of meaningful exposure. Stay aware of common sources to keep it that way.',
      great:
        'Your lead is very low. Maintain awareness of potential exposure sources.',
      elite:
        'Your lead is negligible, indicating no significant exposure. No action needed.',
    }),
  },
  mercury: {
    definition:
      'Mercury is a heavy metal that can accumulate from certain fish and other sources. The body has no use for it, and levels reflect recent and ongoing exposure.',
    impact:
      'Higher mercury can affect the nervous system over time. Levels often relate to diet (large predatory fish), so adjusting intake usually helps.',
    coachInsights: bothGenders({
      poor: 'Your mercury is elevated, commonly from frequent large-predatory-fish intake (tuna, swordfish, king mackerel). Shift toward lower-mercury fish (salmon, sardines), identify other sources, and review with a clinician. Levels fall as exposure drops.',
      cautious:
        'Your mercury is mildly raised. Moderate large-predatory-fish intake in favour of lower-mercury options and recheck after a sustained change.',
      normal:
        'Your mercury is low, with no sign of meaningful accumulation. Keep favouring lower-mercury fish.',
      great:
        'Your mercury is very low. Maintain your current dietary balance.',
      elite:
        'Your mercury is negligible. No action needed.',
    }),
  },
  arsenic: {
    definition:
      'Arsenic is a heavy metal that can occur in some water supplies and foods. The body does not need it, and levels reflect environmental and dietary exposure.',
    impact:
      'Higher arsenic over time is undesirable for several body systems. Sources are often dietary or water-related, so identifying them is the key step.',
    coachInsights: bothGenders({
      poor: 'Your arsenic is elevated. Common sources include certain water supplies and some foods, and a recent seafood meal can also raise it temporarily. Review likely sources with a clinician and recheck after avoiding them.',
      cautious:
        'Your arsenic is mildly raised. Consider recent seafood intake and water sources, and recheck after a period of avoidance to find the true baseline.',
      normal:
        'Your arsenic is low, with no sign of meaningful exposure. Stay aware of water and dietary sources.',
      great:
        'Your arsenic is very low. Maintain awareness of potential sources.',
      elite:
        'Your arsenic is negligible. No action needed.',
    }),
  },
  cadmium: {
    definition:
      'Cadmium is a heavy metal found in cigarette smoke, some foods and certain industrial settings. It accumulates slowly and has no useful role in the body.',
    impact:
      'Higher cadmium over time can affect the kidneys and bones. Smoking is a major source, so removing exposure is the main lever.',
    coachInsights: bothGenders({
      poor: 'Your cadmium is elevated. Smoking is a leading source, so quitting is the single biggest step if relevant; otherwise look at occupational and dietary sources. Review with a clinician and recheck after reducing exposure.',
      cautious:
        'Your cadmium is mildly raised. If you smoke, that is the priority to address; otherwise consider dietary and occupational sources and recheck.',
      normal:
        'Your cadmium is low, with no sign of meaningful exposure. Avoiding smoke keeps it that way.',
      great:
        'Your cadmium is very low. Maintain awareness of potential sources.',
      elite:
        'Your cadmium is negligible. No action needed.',
    }),
  },

  // ──────────────────────────────────────────────────────────────────────
  // Body Composition
  // ──────────────────────────────────────────────────────────────────────
  bwi: {
    definition:
      'The Evolt360 Body Wellness Index (BWI) is a composite score from a body-composition scan that summarises several measures into a single wellness read.',
    impact:
      'As a composite, BWI tracks overall body-composition health and is most useful watched over time as you train and adjust nutrition.',
    coachInsights: bothGenders({
      poor: 'Your BWI is in the Attention range. Rather than chase the composite, we will work the inputs that drive it — building muscle through resistance training and reducing excess fat through nutrition and activity. Re-scan after a consistent block to track progress.',
      cautious:
        'Your BWI is below the optimal band. Focus on the levers behind it — strength training and a supportive nutrition pattern — and re-scan periodically to see it move.',
      normal:
        'Your BWI is in a healthy range. Maintain the training and nutrition habits supporting it and re-scan periodically.',
      great:
        'Your BWI is in a strong band, reflecting good overall body composition. Keep your training and nutrition consistent.',
      elite:
        'Your BWI is excellent, a sign of well-balanced body composition. Sustain the habits behind it.',
    }),
  },
  body_fat_percent: {
    definition:
      'Body fat percentage is the proportion of your total weight that is fat tissue. It is a more meaningful read on composition than weight alone, and healthy ranges differ by sex.',
    impact:
      'A favourable body fat percentage supports metabolic health and how capable you feel, while excess fat — especially around the middle — adds metabolic load. Women naturally and healthily carry more than men.',
    coachInsights: {
      poor: {
        male: 'Your body fat percentage is in the Attention range for men. Combine resistance training to preserve muscle with a modest calorie deficit and higher protein, plus regular aerobic work. Aim for gradual change and re-scan after a consistent block — slow fat loss protects muscle.',
        female:
          'Your body fat percentage is in the Attention range for women (whose healthy range sits higher than men’s). Build muscle with resistance training, use a modest, sustainable deficit with adequate protein, and add aerobic work. Re-scan after a consistent block and prioritise gradual change.',
      },
      cautious: {
        male: 'Your body fat percentage is mildly above the optimal band for men. Keep resistance training, nudge nutrition toward a small deficit and higher protein, and stay active daily. Re-scan periodically.',
        female:
          'Your body fat percentage is mildly above the optimal band for women. Maintain strength training, refine nutrition with adequate protein, and keep daily activity up. Re-scan periodically.',
      },
      normal: {
        male: 'Your body fat percentage is in a healthy range for men. Maintain your training and nutrition, focusing on building or holding muscle.',
        female:
          'Your body fat percentage is in a healthy range for women. Maintain your training and nutrition habits.',
      },
      great: {
        male: 'Your body fat percentage is in a strong band for men. Keep training and eating as you are; consider whether building more muscle is the next goal.',
        female:
          'Your body fat percentage is in a strong band for women. Keep your current habits and consider muscle-building as a next focus.',
      },
      elite: {
        male: 'Your body fat percentage is excellent for men. Ensure intake stays adequate to support training and recovery, and protect muscle mass.',
        female:
          'Your body fat percentage is excellent for women — keep intake adequate to support hormones, training and recovery rather than pushing lower.',
      },
    },
  },
  waist_to_hip: {
    definition:
      'Waist-to-hip ratio compares the circumference of your waist to your hips, giving a simple read on where you carry fat. It highlights central (abdominal) fat in particular.',
    impact:
      'A higher ratio reflects more central fat, which carries more metabolic load than fat on the hips and thighs. Healthy ratios differ between men and women.',
    coachInsights: {
      poor: {
        male: 'Your waist-to-hip ratio is in the Attention range for men, pointing to more central fat. This responds well to aerobic exercise, strength training and reducing refined carbohydrate and alcohol. Re-measure after a consistent block.',
        female:
          'Your waist-to-hip ratio is in the Attention range for women, indicating more central fat. Aerobic and strength training plus nutrition changes help; re-measure after a consistent block.',
      },
      cautious: {
        male: 'Your waist-to-hip ratio is mildly raised for men. Keep building aerobic and strength work and trim refined carbohydrate and alcohol. Re-measure periodically.',
        female:
          'Your waist-to-hip ratio is mildly raised for women. Maintain aerobic and strength training and refine nutrition. Re-measure periodically.',
      },
      normal: {
        male: 'Your waist-to-hip ratio is in a healthy range for men. Maintain your activity and nutrition habits.',
        female:
          'Your waist-to-hip ratio is in a healthy range for women. Maintain your activity and nutrition habits.',
      },
      great: {
        male: 'Your waist-to-hip ratio is in a strong band for men, a good sign of low central fat. Keep it up.',
        female:
          'Your waist-to-hip ratio is in a strong band for women. Keep up the habits behind it.',
      },
      elite: {
        male: 'Your waist-to-hip ratio is excellent for men. Sustain your training and nutrition.',
        female:
          'Your waist-to-hip ratio is excellent for women. Sustain your training and nutrition.',
      },
    },
  },
  lean_mass: {
    definition:
      'Lean mass is everything in your body that is not fat — muscle, bone, organs and water. It is a key marker of physical capacity and metabolic health.',
    impact:
      'More lean mass supports strength, metabolism and resilience as you age. Preserving and building it is one of the most valuable long-term investments in capability.',
    coachInsights: {
      poor: {
        male: 'Your lean mass is lower than ideal for men. Prioritise progressive resistance training and adequate protein across the day — this is the most direct way to build it. Re-scan after a consistent strength block.',
        female:
          'Your lean mass is lower than ideal for women. Resistance training and adequate protein build it effectively; women build strength and muscle very well with consistent training. Re-scan after a consistent block.',
      },
      cautious: {
        male: 'Your lean mass is slightly below the optimal band for men. Keep resistance training progressive and protein adequate, and re-scan periodically.',
        female:
          'Your lean mass is slightly below the optimal band for women. Maintain progressive resistance training and adequate protein, and re-scan periodically.',
      },
      normal: {
        male: 'Your lean mass is in a healthy range for men. Maintain your strength training and protein intake.',
        female:
          'Your lean mass is in a healthy range for women. Maintain your strength training and protein intake.',
      },
      great: {
        male: 'Your lean mass is in a strong band for men, a real asset for strength and metabolism. Keep training and fuelling to maintain it.',
        female:
          'Your lean mass is in a strong band for women. Keep training and fuelling to maintain it.',
      },
      elite: {
        male: 'Your lean mass is excellent for men. Protect it with continued strength work and adequate protein, especially as you age.',
        female:
          'Your lean mass is excellent for women. Protect it with continued strength work and adequate protein.',
      },
    },
  },
  skeletal_muscle_mass: {
    definition:
      'Skeletal muscle mass is the weight of the muscles you move with — the engine for strength, power and daily function. It is a focused subset of lean mass.',
    impact:
      'Skeletal muscle drives strength, supports metabolism and is strongly tied to healthy ageing and independence. Building and keeping it pays dividends for decades.',
    coachInsights: {
      poor: {
        male: 'Your skeletal muscle mass is low for men. Progressive resistance training 2–4×/week with adequate protein is the direct route to building it. Re-scan after a consistent strength block to track gains.',
        female:
          'Your skeletal muscle mass is low for women. Resistance training and protein build it well — women respond strongly to consistent strength work. Re-scan after a consistent block.',
      },
      cautious: {
        male: 'Your skeletal muscle mass is slightly below the optimal band for men. Keep resistance training progressive and protein adequate, and re-scan periodically.',
        female:
          'Your skeletal muscle mass is slightly below the optimal band for women. Maintain progressive resistance training and adequate protein, and re-scan periodically.',
      },
      normal: {
        male: 'Your skeletal muscle mass is in a healthy range for men. Maintain your strength training and protein intake.',
        female:
          'Your skeletal muscle mass is in a healthy range for women. Maintain your strength training and protein intake.',
      },
      great: {
        male: 'Your skeletal muscle mass is in a strong band for men. Keep training and fuelling to hold or build on it.',
        female:
          'Your skeletal muscle mass is in a strong band for women. Keep training and fuelling to hold or build on it.',
      },
      elite: {
        male: 'Your skeletal muscle mass is excellent for men, a strong foundation for performance and ageing well. Protect it with ongoing strength work.',
        female:
          'Your skeletal muscle mass is excellent for women. Protect it with ongoing strength work and adequate protein.',
      },
    },
  },
  fat_mass: {
    definition:
      'Fat mass is the total weight of fat tissue in your body. Some fat is essential; the focus is on keeping total fat — especially around the abdomen — in a healthy range.',
    impact:
      'Excess fat mass, particularly visceral fat, adds metabolic load, while too little can affect hormones and recovery. The goal is a healthy, sustainable balance.',
    coachInsights: {
      poor: {
        male: 'Your fat mass is higher than ideal for men. Combine resistance training to protect muscle with a modest, sustainable calorie deficit, higher protein and regular aerobic work. Aim for gradual loss and re-scan after a consistent block.',
        female:
          'Your fat mass is higher than ideal for women. Use resistance training, a modest deficit with adequate protein and aerobic work; favour gradual, sustainable change. Re-scan after a consistent block.',
      },
      cautious: {
        male: 'Your fat mass is mildly above the optimal band for men. Keep strength training, nudge nutrition toward a small deficit, and stay active daily. Re-scan periodically.',
        female:
          'Your fat mass is mildly above the optimal band for women. Maintain strength training, refine nutrition, and keep daily activity up. Re-scan periodically.',
      },
      normal: {
        male: 'Your fat mass is in a healthy range for men. Maintain your training and nutrition habits.',
        female:
          'Your fat mass is in a healthy range for women. Maintain your training and nutrition habits.',
      },
      great: {
        male: 'Your fat mass is in a strong band for men. Keep your habits steady and consider muscle-building as the next focus.',
        female:
          'Your fat mass is in a strong band for women. Keep your habits steady and consider muscle-building as the next focus.',
      },
      elite: {
        male: 'Your fat mass is excellent for men. Ensure intake stays adequate to support training and recovery.',
        female:
          'Your fat mass is excellent for women — keep intake adequate to support hormones, training and recovery rather than pushing lower.',
      },
    },
  },
  visceral_fat: {
    definition:
      'The visceral fat rating estimates the fat stored deep around your abdominal organs, as opposed to the fat just under the skin. It is the more metabolically active type.',
    impact:
      'Visceral fat is the most metabolically important fat to manage, as more of it adds to metabolic load. Encouragingly, it is often the first fat to respond to exercise and diet.',
    coachInsights: bothGenders({
      poor: 'Your visceral fat rating is in the Attention range. The good news is this fat responds quickly to aerobic exercise, strength training and reducing refined carbohydrate, sugar and alcohol. Make those the priority and re-scan after a consistent block — it tends to move first.',
      cautious:
        'Your visceral fat rating is mildly raised. Build aerobic and strength work and trim refined carbohydrate and alcohol — visceral fat is among the most responsive to these changes. Re-scan periodically.',
      normal:
        'Your visceral fat rating is in a healthy range, a good sign metabolically. Maintain your activity and nutrition habits.',
      great:
        'Your visceral fat rating is in a strong band. Keep the habits supporting low visceral fat.',
      elite:
        'Your visceral fat rating is excellent, a real metabolic strength. Sustain your training and nutrition.',
    }),
  },
  bmr: {
    definition:
      'Basal metabolic rate (BMR) is the energy your body uses at complete rest just to keep its essential functions running. It is the largest part of daily energy use.',
    impact:
      'BMR is influenced strongly by muscle mass, so building muscle tends to raise it. Knowing your BMR helps set sensible nutrition targets.',
    coachInsights: bothGenders({
      poor: 'Your BMR is on the lower side, often linked to lower muscle mass. The most durable way to raise it is to build muscle through resistance training, supported by adequate protein. This also makes nutrition easier to manage. Re-scan after a consistent strength block.',
      cautious:
        'Your BMR is slightly below where it could be. Building muscle through resistance training nudges it up; pair that with adequate protein and re-scan periodically.',
      normal:
        'Your BMR is in a healthy range for your size and composition. Maintain your strength training and protein intake.',
      great:
        'Your BMR is in a strong band, consistent with good muscle mass. Keep training and fuelling to maintain it.',
      elite:
        'Your BMR is excellent for your size, reflecting strong muscle mass. Protect it with ongoing strength work.',
    }),
  },

  // ──────────────────────────────────────────────────────────────────────
  // Cardiovascular Fitness
  // ──────────────────────────────────────────────────────────────────────
  vo2max: {
    definition:
      'VO2 max measures how efficiently your body uses oxygen during hard effort — essentially the size of your aerobic engine. It is one of the most studied markers of fitness.',
    impact:
      'A larger aerobic engine means more capacity for everything you do, and VO2 max is highly trainable at any age. Improving it expands your headroom for both performance and daily life.',
    coachInsights: bothGenders({
      poor: 'Your VO2 max is in the Attention range, and the encouraging part is how trainable it is. Build a base of zone 2 aerobic work (conversational pace) 3–4×/week, then add short, harder intervals once consistent. Re-test after 8–12 weeks — improvements come reliably with consistency.',
      cautious:
        'Your VO2 max is below the optimal band. Increase your weekly aerobic volume at an easy, conversational pace, then layer in interval sessions. It responds well to consistent training — re-test after a solid block.',
      normal:
        'Your VO2 max is in a healthy range. To push higher, add structured interval work alongside your aerobic base; to maintain, keep your current volume consistent.',
      great:
        'Your VO2 max is in a strong band, a real fitness asset. Maintain your aerobic base and intervals, and use this engine to support your other goals.',
      elite:
        'Your VO2 max is excellent — a standout strength. Keep the training that built it consistent, and use this aerobic capacity as a platform for everything else.',
    }),
  },
  resting_hr: {
    definition:
      'Resting heart rate is how many times your heart beats per minute at complete rest. It reflects cardiovascular fitness and recovery status.',
    impact:
      'A lower resting heart rate generally signals a stronger, more efficient heart and good aerobic fitness. It also tends to fall as fitness improves, making it a handy progress marker.',
    coachInsights: bothGenders({
      poor: 'Your resting heart rate is higher than ideal. Aerobic training is the main lever to bring it down, alongside sleep and stress management. A high reading can also reflect poor sleep, stress or a recent stimulant, so confirm at a true rest. Re-check as fitness builds.',
      cautious:
        'Your resting heart rate is mildly elevated. Build aerobic volume and protect sleep and recovery — both lower it over time. Re-check after a consistent training block.',
      normal:
        'Your resting heart rate is in a healthy range, a good sign of cardiovascular fitness. Maintain your aerobic training.',
      great:
        'Your resting heart rate is in a strong, low band, reflecting good aerobic fitness and recovery. Keep your training consistent.',
      elite:
        'Your resting heart rate is excellent, a hallmark of a well-trained heart. Sustain the aerobic work behind it.',
    }),
  },
  blood_pressure_systolic: {
    definition:
      'Systolic blood pressure is the higher of the two blood-pressure numbers — the pressure in your arteries when the heart beats. It is a key cardiovascular marker.',
    impact:
      'Keeping systolic pressure in a healthy range reduces long-term strain on the heart and arteries. It responds to activity, sodium, weight, sleep and stress.',
    coachInsights: bothGenders({
      poor: 'Your systolic blood pressure is in the Attention range. Confirm with repeat readings at rest (a single measurement can be raised by stress or caffeine). Then lean into aerobic exercise, reducing excess sodium, managing weight and stress, and review with a clinician.',
      cautious:
        'Your systolic blood pressure is mildly raised. Build aerobic activity, moderate sodium and alcohol, manage stress, and re-check with several resting readings over a couple of weeks.',
      normal:
        'Your systolic blood pressure is in a healthy range. Maintain your activity, diet and stress-management habits.',
      great:
        'Your systolic blood pressure is in a strong band. Keep the habits supporting it — aerobic exercise and a balanced diet do much of the work.',
      elite:
        'Your systolic blood pressure is excellent. Sustain your current healthy routine.',
    }),
  },
  bp_diastolic: {
    definition:
      'Diastolic blood pressure is the lower of the two numbers — the pressure in your arteries between heartbeats, while the heart rests and refills.',
    impact:
      'Healthy diastolic pressure reflects relaxed, flexible arteries. It is read together with systolic pressure for the full picture, and responds to the same lifestyle levers.',
    coachInsights: bothGenders({
      poor: 'Your diastolic blood pressure is in the Attention range. Confirm with repeat resting readings, then focus on aerobic exercise, sensible sodium and alcohol intake, weight and stress management, and review with a clinician.',
      cautious:
        'Your diastolic blood pressure is mildly raised. Build aerobic activity, moderate sodium and alcohol, and manage stress; re-check with several resting readings.',
      normal:
        'Your diastolic blood pressure is in a healthy range. Maintain your activity and lifestyle habits.',
      great:
        'Your diastolic blood pressure is in a strong band. Keep up the habits supporting it.',
      elite:
        'Your diastolic blood pressure is excellent. Sustain your current routine.',
    }),
  },

  // ──────────────────────────────────────────────────────────────────────
  // Strength Testing
  // ──────────────────────────────────────────────────────────────────────
  grip_strength_left: {
    definition:
      'Grip strength in the left hand measures how forcefully you can squeeze. Grip is a well-studied proxy for whole-body strength and a marker of healthy ageing.',
    impact:
      'Grip strength tracks closely with overall strength and independence later in life. It is easy to monitor and responds to general and grip-specific training.',
    coachInsights: bothGenders({
      poor: 'Your left grip strength is in the Attention range. Build it with general resistance training plus grip-specific work — carries, hangs and holds. Compare with your right side too, as a large gap can flag an imbalance worth addressing. Re-test after a consistent block.',
      cautious:
        'Your left grip strength is below the optimal band. Add loaded carries, hangs and rows to your training, and check the left–right balance. Re-test periodically.',
      normal:
        'Your left grip strength is in a healthy range. Maintain resistance training that loads the hands and forearms.',
      great:
        'Your left grip strength is in a strong band, a good sign of whole-body strength. Keep training as you are.',
      elite:
        'Your left grip strength is excellent. Sustain the strength work behind it and keep an eye on left–right balance.',
    }),
  },
  grip_strength_right: {
    definition:
      'Grip strength in the right hand measures how forcefully you can squeeze. Grip is a well-studied proxy for whole-body strength and a marker of healthy ageing.',
    impact:
      'Grip strength tracks closely with overall strength and independence later in life. It is easy to monitor and responds to general and grip-specific training.',
    coachInsights: bothGenders({
      poor: 'Your right grip strength is in the Attention range. Build it with general resistance training plus grip work — carries, hangs and holds — and compare with the left side, since a large gap can signal an imbalance. Re-test after a consistent block.',
      cautious:
        'Your right grip strength is below the optimal band. Add loaded carries, hangs and rows, and check the left–right balance. Re-test periodically.',
      normal:
        'Your right grip strength is in a healthy range. Maintain resistance training that loads the hands and forearms.',
      great:
        'Your right grip strength is in a strong band, a good sign of whole-body strength. Keep training as you are.',
      elite:
        'Your right grip strength is excellent. Sustain the strength work behind it and watch left–right balance.',
    }),
  },
  cmj_left: {
    definition:
      'The counter-movement jump (left) measures lower-body power on the left leg — how explosively you can produce force when you dip and jump. It reflects fast, athletic strength.',
    impact:
      'Lower-body power supports athletic movement, fall resistance and quality of life with age. Comparing sides helps reveal imbalances that can affect performance and injury risk.',
    coachInsights: bothGenders({
      poor: 'Your left-leg jump power is in the Attention range. Build a strength base first (squats, lunges, hinges), then add explosive work like jumps and bounds. Watch the left–right balance closely. Re-test after a consistent block.',
      cautious:
        'Your left-leg jump power is below the optimal band. Combine lower-body strength work with light plyometrics, and address any left–right gap. Re-test periodically.',
      normal:
        'Your left-leg jump power is in a healthy range. Maintain strength and add occasional explosive work to keep it sharp.',
      great:
        'Your left-leg jump power is in a strong band. Keep training strength and power, and monitor side-to-side balance.',
      elite:
        'Your left-leg jump power is excellent. Sustain the strength and plyometric work behind it and watch balance between legs.',
    }),
  },
  cmj_right: {
    definition:
      'The counter-movement jump (right) measures lower-body power on the right leg — how explosively you can produce force when you dip and jump. It reflects fast, athletic strength.',
    impact:
      'Lower-body power supports athletic movement, fall resistance and quality of life with age. Comparing sides helps reveal imbalances that can affect performance and injury risk.',
    coachInsights: bothGenders({
      poor: 'Your right-leg jump power is in the Attention range. Build a strength base (squats, lunges, hinges), then add jumps and bounds, and watch the left–right balance. Re-test after a consistent block.',
      cautious:
        'Your right-leg jump power is below the optimal band. Combine lower-body strength with light plyometrics, and address any side-to-side gap. Re-test periodically.',
      normal:
        'Your right-leg jump power is in a healthy range. Maintain strength and add occasional explosive work to keep it sharp.',
      great:
        'Your right-leg jump power is in a strong band. Keep training strength and power, and monitor balance between legs.',
      elite:
        'Your right-leg jump power is excellent. Sustain the work behind it and watch left–right balance.',
    }),
  },
  imtp_max_force: {
    definition:
      'The isometric mid-thigh pull (IMTP) max force measures the peak force you can produce in a strong pulling position. It is a clean read on maximal whole-body strength.',
    impact:
      'Maximal force is a foundation for power, resilience and capability. Building it underpins almost every other physical quality and supports healthy ageing.',
    coachInsights: bothGenders({
      poor: 'Your IMTP max force is in the Attention range. Progressive heavy strength training — squats, deadlifts, presses, rows — is the direct route to building it. Train consistently with gradual load increases and re-test after a solid block.',
      cautious:
        'Your IMTP max force is below the optimal band. Keep your compound lifts progressive and well-recovered, and re-test periodically to track gains.',
      normal:
        'Your IMTP max force is in a healthy range. Maintain progressive strength training to hold or build on it.',
      great:
        'Your IMTP max force is in a strong band, a solid foundation of maximal strength. Keep your training progressive.',
      elite:
        'Your IMTP max force is excellent — a genuine strength asset. Sustain the heavy compound work behind it.',
    }),
  },
  single_leg_hop_left: {
    definition:
      'The single-leg hop (left) measures how far you can hop on the left leg, reflecting that leg’s power, control and confidence. It is widely used to assess limb symmetry.',
    impact:
      'Single-leg power and control matter for athletic movement and injury resilience. A clear left–right difference is a useful flag for targeted work.',
    coachInsights: bothGenders({
      poor: 'Your left single-leg hop is in the Attention range. Build single-leg strength and control (split squats, step-ups, balance work) before progressing to hops and bounds. Pay close attention to the left–right gap. Re-test after a consistent block.',
      cautious:
        'Your left single-leg hop is below the optimal band. Add single-leg strength and light plyometric work, and address any side-to-side difference. Re-test periodically.',
      normal:
        'Your left single-leg hop is in a healthy range. Maintain single-leg strength and occasional hopping work.',
      great:
        'Your left single-leg hop is in a strong band. Keep training single-leg power and monitor symmetry.',
      elite:
        'Your left single-leg hop is excellent. Sustain the work behind it and keep an eye on left–right balance.',
    }),
  },
  single_leg_hop_right: {
    definition:
      'The single-leg hop (right) measures how far you can hop on the right leg, reflecting that leg’s power, control and confidence. It is widely used to assess limb symmetry.',
    impact:
      'Single-leg power and control matter for athletic movement and injury resilience. A clear left–right difference is a useful flag for targeted work.',
    coachInsights: bothGenders({
      poor: 'Your right single-leg hop is in the Attention range. Build single-leg strength and control (split squats, step-ups, balance work) before progressing to hops. Watch the left–right gap closely. Re-test after a consistent block.',
      cautious:
        'Your right single-leg hop is below the optimal band. Add single-leg strength and light plyometrics, and address any side-to-side difference. Re-test periodically.',
      normal:
        'Your right single-leg hop is in a healthy range. Maintain single-leg strength and occasional hopping work.',
      great:
        'Your right single-leg hop is in a strong band. Keep training single-leg power and monitor symmetry.',
      elite:
        'Your right single-leg hop is excellent. Sustain the work behind it and watch left–right balance.',
    }),
  },
  single_leg_balance_left: {
    definition:
      'Single-leg balance (left) measures how steadily you can stand on the left leg. It reflects coordination, proprioception and the small stabilising muscles around the ankle, knee and hip.',
    impact:
      'Good single-leg balance underpins confident movement and is a quiet defence against falls and missteps. It improves quickly with practice.',
    coachInsights: bothGenders({
      poor: 'Your left single-leg balance is in the Attention range, but it responds fast to practice. Work daily single-leg holds, progress to eyes-closed and unstable surfaces, and strengthen the ankle and hip. Compare with the right side. Re-test after a few weeks.',
      cautious:
        'Your left single-leg balance is below the optimal band. Add short daily balance drills and ankle/hip strengthening, and check the left–right difference. Re-test periodically.',
      normal:
        'Your left single-leg balance is in a healthy range. Maintain it with occasional balance practice.',
      great:
        'Your left single-leg balance is in a strong band, a good sign of coordination and control. Keep practising occasionally.',
      elite:
        'Your left single-leg balance is excellent. Sustain it with periodic balance work and watch left–right symmetry.',
    }),
  },
  single_leg_balance_right: {
    definition:
      'Single-leg balance (right) measures how steadily you can stand on the right leg. It reflects coordination, proprioception and the small stabilising muscles around the ankle, knee and hip.',
    impact:
      'Good single-leg balance underpins confident movement and is a quiet defence against falls and missteps. It improves quickly with practice.',
    coachInsights: bothGenders({
      poor: 'Your right single-leg balance is in the Attention range, but it responds fast to practice. Work daily single-leg holds, progress to eyes-closed and unstable surfaces, and strengthen the ankle and hip. Compare with the left side. Re-test after a few weeks.',
      cautious:
        'Your right single-leg balance is below the optimal band. Add short daily balance drills and ankle/hip strengthening, and check the left–right difference. Re-test periodically.',
      normal:
        'Your right single-leg balance is in a healthy range. Maintain it with occasional balance practice.',
      great:
        'Your right single-leg balance is in a strong band, a good sign of coordination and control. Keep practising occasionally.',
      elite:
        'Your right single-leg balance is excellent. Sustain it with periodic balance work and watch left–right symmetry.',
    }),
  },
  shoulder_iso_y_left: {
    definition:
      'The shoulder isometric-Y test (left) measures the strength of the muscles that stabilise and lift the left shoulder in a Y position. It reflects shoulder strength and control.',
    impact:
      'Strong, balanced shoulder stabilisers support pressing, pulling and overhead movement, and help protect the shoulder from strain. Side-to-side balance matters here too.',
    coachInsights: bothGenders({
      poor: 'Your left shoulder strength in this position is in the Attention range. Build the stabilisers with controlled Y-raises, band work and balanced pressing and pulling. Watch the left–right gap. Re-test after a consistent block.',
      cautious:
        'Your left shoulder strength is below the optimal band. Add targeted shoulder stability work and keep pressing and pulling balanced. Re-test periodically.',
      normal:
        'Your left shoulder strength is in a healthy range. Maintain balanced shoulder training.',
      great:
        'Your left shoulder strength is in a strong band, supporting resilient overhead movement. Keep training as you are.',
      elite:
        'Your left shoulder strength is excellent. Sustain the balanced shoulder work behind it and monitor symmetry.',
    }),
  },
  shoulder_iso_y_right: {
    definition:
      'The shoulder isometric-Y test (right) measures the strength of the muscles that stabilise and lift the right shoulder in a Y position. It reflects shoulder strength and control.',
    impact:
      'Strong, balanced shoulder stabilisers support pressing, pulling and overhead movement, and help protect the shoulder from strain. Side-to-side balance matters here too.',
    coachInsights: bothGenders({
      poor: 'Your right shoulder strength in this position is in the Attention range. Build the stabilisers with controlled Y-raises, band work and balanced pressing and pulling, and watch the left–right gap. Re-test after a consistent block.',
      cautious:
        'Your right shoulder strength is below the optimal band. Add targeted shoulder stability work and keep pressing and pulling balanced. Re-test periodically.',
      normal:
        'Your right shoulder strength is in a healthy range. Maintain balanced shoulder training.',
      great:
        'Your right shoulder strength is in a strong band, supporting resilient overhead movement. Keep training as you are.',
      elite:
        'Your right shoulder strength is excellent. Sustain the balanced shoulder work behind it and monitor symmetry.',
    }),
  },
  pushups_max: {
    definition:
      'The push-up max test counts how many push-ups you can perform with good form. It reflects upper-body strength endurance and core stability.',
    impact:
      'Push-up capacity is a practical read on upper-body endurance and has been linked to general fitness. It improves steadily with consistent training.',
    coachInsights: bothGenders({
      poor: 'Your push-up max is in the Attention range. Build it with regular pressing work — start from an incline if needed and progress gradually, training the movement a few times a week. Re-test after a consistent block; numbers climb quickly with practice.',
      cautious:
        'Your push-up max is below the optimal band. Train pressing strength and practise the push-up itself regularly, progressing reps over time. Re-test periodically.',
      normal:
        'Your push-up max is in a healthy range. Maintain regular pressing work to hold or build on it.',
      great:
        'Your push-up max is in a strong band, a good sign of upper-body endurance. Keep training and consider adding load or harder variations.',
      elite:
        'Your push-up max is excellent. Sustain it and progress with weighted or more demanding variations to keep improving.',
    }),
  },
  dead_man_hang: {
    definition:
      'The dead-man (dead) hang measures how long you can hang from a bar. It reflects grip endurance and shoulder and upper-body resilience.',
    impact:
      'Hang time is a simple read on grip endurance and shoulder health, both useful for daily function and athletic capacity. It improves quickly with regular practice.',
    coachInsights: bothGenders({
      poor: 'Your dead hang time is in the Attention range. Practise hanging daily for short, comfortable holds, building gradually — this strengthens grip and decompresses the shoulders. Re-test after a few weeks of consistency.',
      cautious:
        'Your dead hang time is below the optimal band. Add regular hangs and grip work (carries, rows), progressing the duration over time. Re-test periodically.',
      normal:
        'Your dead hang time is in a healthy range. Maintain regular hangs and grip work.',
      great:
        'Your dead hang time is in a strong band, a good sign of grip endurance and shoulder health. Keep practising.',
      elite:
        'Your dead hang time is excellent. Sustain it and consider weighted or single-arm progressions to keep improving.',
    }),
  },
  farmers_carry_distance: {
    definition:
      'The farmers carry measures how far you can walk while carrying a heavy load in each hand. It tests grip, core stability and whole-body strength endurance together.',
    impact:
      'Loaded carries reflect real-world strength — the ability to pick things up and move them — and build resilience across the whole body. Distance improves with consistent loaded training.',
    coachInsights: bothGenders({
      poor: 'Your farmers carry distance is in the Attention range. Add loaded carries to your training once or twice a week, starting with a manageable load and building distance gradually. This carries over to grip, core and whole-body strength. Re-test after a consistent block.',
      cautious:
        'Your farmers carry distance is below the optimal band. Build it with regular carries and supporting strength work (deadlifts, rows). Progress load and distance over time and re-test periodically.',
      normal:
        'Your farmers carry distance is in a healthy range. Maintain regular loaded carries to hold or build on it.',
      great:
        'Your farmers carry distance is in a strong band, reflecting good whole-body strength endurance. Keep carries in your routine.',
      elite:
        'Your farmers carry distance is excellent. Sustain it and progress the load to keep building real-world strength.',
    }),
  },

  // ──────────────────────────────────────────────────────────────────────
  // Mobility & Flexibility
  // ──────────────────────────────────────────────────────────────────────
  hip_mobility_left: {
    definition:
      'Hip mobility (left) measures the range of motion available at your left hip. Good hip mobility underpins squatting, hinging, walking and overall lower-body movement.',
    impact:
      'Healthy hip mobility supports efficient, pain-free movement and reduces compensations elsewhere, like the lower back. It improves with consistent mobility work.',
    coachInsights: bothGenders({
      poor: 'Your left hip mobility is in the Attention range. Add daily targeted mobility work — hip openers, controlled rotations and dynamic stretches — and strengthen through the new range. Compare with the right side. Re-test after a few weeks of consistency.',
      cautious:
        'Your left hip mobility is below the optimal band. Build in regular hip mobility drills and loaded movement through range, and check the left–right difference. Re-test periodically.',
      normal:
        'Your left hip mobility is in a healthy range. Maintain it with regular movement and occasional mobility work.',
      great:
        'Your left hip mobility is in a strong band, supporting clean lower-body movement. Keep up the mobility habits behind it.',
      elite:
        'Your left hip mobility is excellent. Sustain it with continued movement variety and watch left–right symmetry.',
    }),
  },
  hip_mobility_right: {
    definition:
      'Hip mobility (right) measures the range of motion available at your right hip. Good hip mobility underpins squatting, hinging, walking and overall lower-body movement.',
    impact:
      'Healthy hip mobility supports efficient, pain-free movement and reduces compensations elsewhere, like the lower back. It improves with consistent mobility work.',
    coachInsights: bothGenders({
      poor: 'Your right hip mobility is in the Attention range. Add daily targeted mobility work — hip openers, controlled rotations and dynamic stretches — and strengthen through the new range. Compare with the left side. Re-test after a few weeks.',
      cautious:
        'Your right hip mobility is below the optimal band. Build in regular hip mobility drills and loaded movement through range, and check the left–right difference. Re-test periodically.',
      normal:
        'Your right hip mobility is in a healthy range. Maintain it with regular movement and occasional mobility work.',
      great:
        'Your right hip mobility is in a strong band, supporting clean lower-body movement. Keep up the mobility habits behind it.',
      elite:
        'Your right hip mobility is excellent. Sustain it with continued movement variety and watch left–right symmetry.',
    }),
  },
  overhead_reach_left: {
    definition:
      'Overhead reach (left) measures how freely you can raise your left arm fully overhead. It reflects shoulder and upper-back mobility on that side.',
    impact:
      'Full overhead reach supports pressing, pulling and everyday overhead tasks, and reduces strain on the shoulder. Restrictions often respond well to mobility work.',
    coachInsights: bothGenders({
      poor: 'Your left overhead reach is in the Attention range. Work on shoulder and upper-back mobility — thoracic extension, lat and pec stretches, controlled overhead drills — and build strength through the range. Compare with the right side. Re-test after a few weeks.',
      cautious:
        'Your left overhead reach is below the optimal band. Add regular thoracic and shoulder mobility work and check the left–right difference. Re-test periodically.',
      normal:
        'Your left overhead reach is in a healthy range. Maintain it with regular overhead movement and mobility.',
      great:
        'Your left overhead reach is in a strong band, supporting healthy overhead movement. Keep the mobility habits behind it.',
      elite:
        'Your left overhead reach is excellent. Sustain it with continued mobility work and watch left–right symmetry.',
    }),
  },
  overhead_reach_right: {
    definition:
      'Overhead reach (right) measures how freely you can raise your right arm fully overhead. It reflects shoulder and upper-back mobility on that side.',
    impact:
      'Full overhead reach supports pressing, pulling and everyday overhead tasks, and reduces strain on the shoulder. Restrictions often respond well to mobility work.',
    coachInsights: bothGenders({
      poor: 'Your right overhead reach is in the Attention range. Work on shoulder and upper-back mobility — thoracic extension, lat and pec stretches, controlled overhead drills — and build strength through the range. Compare with the left side. Re-test after a few weeks.',
      cautious:
        'Your right overhead reach is below the optimal band. Add regular thoracic and shoulder mobility work and check the left–right difference. Re-test periodically.',
      normal:
        'Your right overhead reach is in a healthy range. Maintain it with regular overhead movement and mobility.',
      great:
        'Your right overhead reach is in a strong band, supporting healthy overhead movement. Keep the mobility habits behind it.',
      elite:
        'Your right overhead reach is excellent. Sustain it with continued mobility work and watch left–right symmetry.',
    }),
  },
  shoulder_mobility_left: {
    definition:
      'Shoulder mobility (left) measures the range of motion around your left shoulder, often via a reach-behind-the-back test. It reflects the joint’s freedom and the surrounding tissue length.',
    impact:
      'Good shoulder mobility supports overhead and reaching movements and helps protect the joint. Limitations usually improve with consistent, gentle mobility work.',
    coachInsights: bothGenders({
      poor: 'Your left shoulder mobility is in the Attention range. Add gentle, regular mobility drills (controlled reaches, band dislocates, thoracic work) and strengthen through the available range. Compare with the right side. Re-test after a few weeks.',
      cautious:
        'Your left shoulder mobility is below the optimal band. Build in regular shoulder mobility work and check the left–right difference. Re-test periodically.',
      normal:
        'Your left shoulder mobility is in a healthy range. Maintain it with regular movement and occasional mobility work.',
      great:
        'Your left shoulder mobility is in a strong band, supporting free overhead movement. Keep the habits behind it.',
      elite:
        'Your left shoulder mobility is excellent. Sustain it with continued mobility work and watch left–right symmetry.',
    }),
  },
  shoulder_mobility_right: {
    definition:
      'Shoulder mobility (right) measures the range of motion around your right shoulder, often via a reach-behind-the-back test. It reflects the joint’s freedom and the surrounding tissue length.',
    impact:
      'Good shoulder mobility supports overhead and reaching movements and helps protect the joint. Limitations usually improve with consistent, gentle mobility work.',
    coachInsights: bothGenders({
      poor: 'Your right shoulder mobility is in the Attention range. Add gentle, regular mobility drills (controlled reaches, band dislocates, thoracic work) and strengthen through the available range. Compare with the left side. Re-test after a few weeks.',
      cautious:
        'Your right shoulder mobility is below the optimal band. Build in regular shoulder mobility work and check the left–right difference. Re-test periodically.',
      normal:
        'Your right shoulder mobility is in a healthy range. Maintain it with regular movement and occasional mobility work.',
      great:
        'Your right shoulder mobility is in a strong band, supporting free overhead movement. Keep the habits behind it.',
      elite:
        'Your right shoulder mobility is excellent. Sustain it with continued mobility work and watch left–right symmetry.',
    }),
  },
  ankle_dorsiflexion_left: {
    definition:
      'Ankle dorsiflexion (left) measures how far your left knee can travel forward over the toes with the heel down — the ankle’s forward bend. It underpins squatting, lunging and walking.',
    impact:
      'Adequate ankle mobility allows clean squatting and lunging and reduces compensations up the chain at the knee and hip. It usually improves with targeted work.',
    coachInsights: bothGenders({
      poor: 'Your left ankle dorsiflexion is in the Attention range. Work on calf and ankle mobility — knee-to-wall drills, calf stretches and loaded movement through range. Compare with the right side, as restriction can drive knee compensations. Re-test after a few weeks.',
      cautious:
        'Your left ankle dorsiflexion is below the optimal band. Add regular ankle mobility drills and check the left–right difference. Re-test periodically.',
      normal:
        'Your left ankle dorsiflexion is in a healthy range. Maintain it with regular movement and occasional mobility work.',
      great:
        'Your left ankle dorsiflexion is in a strong band, supporting clean squatting and lunging. Keep the habits behind it.',
      elite:
        'Your left ankle dorsiflexion is excellent. Sustain it with continued mobility work and watch left–right symmetry.',
    }),
  },
  ankle_dorsiflexion_right: {
    definition:
      'Ankle dorsiflexion (right) measures how far your right knee can travel forward over the toes with the heel down — the ankle’s forward bend. It underpins squatting, lunging and walking.',
    impact:
      'Adequate ankle mobility allows clean squatting and lunging and reduces compensations up the chain at the knee and hip. It usually improves with targeted work.',
    coachInsights: bothGenders({
      poor: 'Your right ankle dorsiflexion is in the Attention range. Work on calf and ankle mobility — knee-to-wall drills, calf stretches and loaded movement through range. Compare with the left side, as restriction can drive knee compensations. Re-test after a few weeks.',
      cautious:
        'Your right ankle dorsiflexion is below the optimal band. Add regular ankle mobility drills and check the left–right difference. Re-test periodically.',
      normal:
        'Your right ankle dorsiflexion is in a healthy range. Maintain it with regular movement and occasional mobility work.',
      great:
        'Your right ankle dorsiflexion is in a strong band, supporting clean squatting and lunging. Keep the habits behind it.',
      elite:
        'Your right ankle dorsiflexion is excellent. Sustain it with continued mobility work and watch left–right symmetry.',
    }),
  },
};
