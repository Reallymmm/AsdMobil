import { Platform, StyleSheet, TextStyle, ViewStyle } from 'react-native';

/**
 * Дизайн-токены LUCID — Liquid Glassmorphism.
 * Глубокая тёмная тема, тонкие светящиеся границы, мягкие тени.
 */
export const colors = {
  bg: '#05070F',
  bgDeep: '#030409',
  text: '#EAF2FF',
  textDim: 'rgba(234, 242, 255, 0.60)',
  textFaint: 'rgba(234, 242, 255, 0.38)',
  glass: 'rgba(255, 255, 255, 0.065)',
  glassStrong: 'rgba(255, 255, 255, 0.10)',
  glassBorder: 'rgba(255, 255, 255, 0.16)',
  glassBorderSoft: 'rgba(255, 255, 255, 0.10)',
  brand: '#7EE8FA',
  brandDim: '#9D7BFF',
  danger: '#FF5C7A',
} as const;

export const fonts = {
  displayLight: 'Unbounded-Light',
  display: 'Unbounded',
  displayBold: 'Unbounded-Bold',
  body: 'Manrope',
  bodyMedium: 'Manrope-Medium',
  bodyBold: 'Manrope-Bold',
} as const;

export const spacing = { xs: 6, s: 10, m: 16, l: 24, xl: 36 } as const;

export const radius = { m: 18, l: 26, pill: 999 } as const;

export const shadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  android: { elevation: 10 },
  default: {},
}) as ViewStyle;

/** Матовое стекло: полупрозрачная заливка + светящаяся граница + тень.
 *  На вебе добавляется настоящий backdrop-blur. */
export function glassStyle(opts?: {
  intensity?: number;
  borderColor?: string;
  radius?: number;
}): ViewStyle {
  const intensity = opts?.intensity ?? 1;
  const style: ViewStyle = {
    backgroundColor: `rgba(255, 255, 255, ${0.055 * intensity})`,
    borderColor: opts?.borderColor ?? colors.glassBorder,
    borderWidth: StyleSheet.hairlineWidth * 1.4,
    borderRadius: opts?.radius ?? radius.l,
    ...shadow,
  };
  if (Platform.OS === 'web') {
    (style as Record<string, unknown>).backdropFilter = 'blur(20px) saturate(150%)';
    (style as Record<string, unknown>).WebkitBackdropFilter = 'blur(20px) saturate(150%)';
  }
  return style;
}

export const type = {
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.text,
    letterSpacing: 0.5,
  } as TextStyle,
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textDim,
  } as TextStyle,
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.text,
    letterSpacing: 7,
  } as TextStyle,
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  } as TextStyle,
} as const;

/** Пружинные пресеты — всё движение в приложении «мягкое и текучее». */
export const springs = {
  gentle: { damping: 18, mass: 0.9, stiffness: 120, overshootClamping: false },
  snappy: { damping: 14, mass: 0.7, stiffness: 190, overshootClamping: false },
  dreamy: { damping: 20, mass: 1.1, stiffness: 90, overshootClamping: false },
} as const;
