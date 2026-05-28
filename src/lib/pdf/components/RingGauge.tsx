import { View, Text, Svg, Circle } from '@react-pdf/renderer';
import { COLORS } from '@/lib/pdf/colors';
import { FONT, WEIGHT } from '@/lib/pdf/fonts';
import { TRAFFIC_LIGHT_HEX } from '@/lib/pillars/colors';
import type { PillarStatus } from '@/lib/pillars/types';

interface RingGaugeProps {
  score: number | null;
  status: PillarStatus;
  /** Outer diameter in pt. */
  size?: number;
  /** Ring stroke width in pt. */
  strokeWidth?: number;
  /** Centre numeric font size. */
  fontSize?: number;
  /** Show a "/ 100" denominator under the number (large rings only). */
  showDenominator?: boolean;
  /** Background colour that fills the ring hole (page or surface). */
  holeColor?: string;
}

// Pending ring track on dark - matches COLORS.border.
const PENDING_RING = COLORS.border;

/**
 * SVG ring gauge. The arc length is `pct%` of the circumference drawn via
 * strokeDasharray; rotating the circle -90deg starts it at 12 o'clock
 * (mirrors the portal conic-gradient). The centre numeric is a positioned
 * <Text> overlay because react-pdf SVG <Text> is unreliable.
 *
 * Palette sovereignty (D-11/D-16): the arc accent uses ONLY the traffic-light
 * status palette, never the 5-tier marker palette.
 */
export function RingGauge({
  score,
  status,
  size = 60,
  strokeWidth = 6,
  fontSize = 14,
  showDenominator = false,
  holeColor = COLORS.bgLight,
}: RingGaugeProps) {
  const isPending = status === 'pending' || score === null;
  const pct = isPending ? 0 : Math.max(0, Math.min(100, score as number));
  const accent = isPending
    ? PENDING_RING
    : TRAFFIC_LIGHT_HEX[status] ?? COLORS.gold;
  const numColor = isPending ? COLORS.textMuted : accent;

  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const arcLen = (pct / 100) * circumference;

  return (
    <View
      style={{
        width: size,
        height: size,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={PENDING_RING}
          strokeWidth={strokeWidth}
          fill={holeColor}
        />
        {pct > 0 ? (
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={accent}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${arcLen} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ) : null}
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: FONT.mono,
            fontWeight: WEIGHT.bold,
            fontSize,
            lineHeight: 1,
            color: numColor,
          }}
        >
          {isPending ? '-' : `${score}`}
        </Text>
        {showDenominator ? (
          <Text
            style={{
              fontFamily: FONT.mono,
              fontWeight: WEIGHT.regular,
              fontSize: Math.max(6, Math.round(fontSize * 0.26)),
              letterSpacing: 0.6,
              color: COLORS.textMuted,
              marginTop: 1,
            }}
          >
            / 100
          </Text>
        ) : null}
      </View>
    </View>
  );
}
