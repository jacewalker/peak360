import type { RatingTier } from '@/types/normative';

export type PillarKey =
  | 'cardiometabolic'
  | 'aerobic'
  | 'bodyComposition'
  | 'strength'
  | 'balance';

export interface PillarDef {
  key: PillarKey;
  label: string;
  blurb: string;
}

export const PILLARS: PillarDef[] = [
  { key: 'cardiometabolic', label: 'Cardiometabolic', blurb: 'Lipids, glucose, inflammation' },
  { key: 'aerobic', label: 'Aerobic Fitness', blurb: 'VO₂, heart rate, blood pressure' },
  { key: 'bodyComposition', label: 'Body Composition', blurb: 'Body fat, lean mass, ratios' },
  { key: 'strength', label: 'Strength', blurb: 'Grip, jumps, push-ups, hangs' },
  { key: 'balance', label: 'Balance', blurb: 'Single-leg stability' },
];

export type TrafficLight = 'green' | 'amber' | 'red' | 'pending';

export interface PillarScore {
  key: PillarKey;
  label: string;
  blurb: string;
  rated: number;
  total: number;
  score: number | null;
  status: TrafficLight;
}

interface MarkerInput {
  testKey: string;
  label: string;
  category: string;
  subcategory?: string;
  tier: RatingTier | null;
}

const TIER_VALUE: Record<RatingTier, number> = {
  poor: 10,
  cautious: 35,
  normal: 60,
  great: 82,
  elite: 95,
};

const BALANCE_RE = /balance|sway|stability/i;

export function pillarKey(m: { testKey: string; label: string; category: string; subcategory?: string }): PillarKey | null {
  if (BALANCE_RE.test(m.testKey) || BALANCE_RE.test(m.label)) return 'balance';

  switch (m.category) {
    case 'Body Composition':
      return 'bodyComposition';
    case 'Cardiovascular Fitness':
      return 'aerobic';
    case 'Strength Testing':
      return 'strength';
    case 'Mobility & Flexibility':
      return null;
    case 'Blood Tests & Biomarkers': {
      const sub = m.subcategory || '';
      if (sub === 'Lipid Panel' || sub === 'Glucose & Metabolic' || sub === 'Inflammation') {
        return 'cardiometabolic';
      }
      return null;
    }
    default:
      return null;
  }
}

function statusFromScore(score: number | null): TrafficLight {
  if (score == null) return 'pending';
  if (score >= 70) return 'green';
  if (score >= 45) return 'amber';
  return 'red';
}

export function computeAllPillarScores(markers: MarkerInput[]): PillarScore[] {
  const buckets = new Map<PillarKey, MarkerInput[]>();
  for (const p of PILLARS) buckets.set(p.key, []);

  for (const m of markers) {
    const k = pillarKey(m);
    if (!k) continue;
    buckets.get(k)!.push(m);
  }

  return PILLARS.map((p) => {
    const all = buckets.get(p.key) || [];
    const rated = all.filter((m) => m.tier != null);
    const total = all.length;
    if (rated.length === 0) {
      return { key: p.key, label: p.label, blurb: p.blurb, rated: 0, total, score: null, status: 'pending' as const };
    }
    const sum = rated.reduce((acc, m) => acc + TIER_VALUE[m.tier as RatingTier], 0);
    const score = Math.round(sum / rated.length);
    return { key: p.key, label: p.label, blurb: p.blurb, rated: rated.length, total, score, status: statusFromScore(score) };
  });
}

export const TRAFFIC_LIGHT: Record<TrafficLight, { fill: string; bg: string; ring: string; text: string; label: string }> = {
  green: { fill: '#16a34a', bg: '#dcfce7', ring: 'rgba(22,163,74,0.25)', text: '#166534', label: 'Strong' },
  amber: { fill: '#f59e0b', bg: '#fef3c7', ring: 'rgba(245,158,11,0.30)', text: '#92400e', label: 'Needs work' },
  red: { fill: '#dc2626', bg: '#fee2e2', ring: 'rgba(220,38,38,0.30)', text: '#991b1b', label: 'Priority' },
  pending: { fill: '#94a3b8', bg: '#f1f5f9', ring: 'rgba(148,163,184,0.25)', text: '#475569', label: 'Pending' },
};
