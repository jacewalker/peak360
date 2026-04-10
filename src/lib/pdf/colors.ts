import type { RatingTier } from '@/types/normative';

export const COLORS = {
  navy: '#1a365d',
  navyDark: '#0f2440',
  navyLight: '#2d5986',
  gold: '#F5A623',
  goldDark: '#d4891a',
  textPrimary: '#1a202c',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  textFaint: '#cbd5e1',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  bgLight: '#f8fafc',
  bgLighter: '#f9fafb',
  white: '#ffffff',
};

export const TIER_COLORS_PDF: Record<RatingTier, string> = {
  elite: '#10b981',
  great: '#3b82f6',
  normal: '#6b7280',
  cautious: '#f59e0b',
  poor: '#ef4444',
};

export const TIER_ROW_BG_PDF: Record<RatingTier, string> = {
  elite: '#ecfdf5',
  great: '#eff6ff',
  normal: '#f9fafb',
  cautious: '#fffbeb',
  poor: '#fef2f2',
};

export const TIER_BORDER_PDF: Record<RatingTier, string> = {
  elite: '#10b981',
  great: '#3b82f6',
  normal: '#9ca3af',
  cautious: '#f59e0b',
  poor: '#ef4444',
};

export const TIER_TEXT_PDF: Record<RatingTier, string> = {
  elite: '#065f46',
  great: '#1e40af',
  normal: '#374151',
  cautious: '#92400e',
  poor: '#991b1b',
};
