import { StyleSheet } from '@react-pdf/renderer';
import { COLORS } from './colors';
import { FONT, WEIGHT } from './fonts';

export const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 25,
    fontFamily: FONT.sans,
    fontWeight: WEIGHT.regular,
    fontSize: 10,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.page,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 16,
  },
  sectionHeadingBar: {
    width: 3,
    height: 16,
    backgroundColor: COLORS.gold,
    borderRadius: 2,
  },
  sectionHeadingText: {
    fontSize: 13,
    fontFamily: FONT.sans,
    fontWeight: WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  card: {
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  label: {
    fontSize: 7,
    fontFamily: FONT.mono,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: 9,
    fontFamily: FONT.sans,
    fontWeight: WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 25,
    right: 25,
    flexDirection: 'column',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 4,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.textMuted,
  },
});

export { COLORS } from './colors';
