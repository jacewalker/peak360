'use client';

import type { RatingTier } from '@/types/normative';
import { TIER_COLORS, TIER_LABELS } from '@/types/normative';

interface BadgeProps {
  tier: RatingTier;
  className?: string;
}

export default function Badge({ tier, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${TIER_COLORS[tier]} ${className}`}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}
