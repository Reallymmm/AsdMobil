/**
 * Переиспользуемый «Стеклянный контейнер» (Шаг 2 ТЗ).
 *
 * Рецепт Liquid Glassmorphism:
 *  • полупрозрачная светлая заливка (интенсивность настраивается);
 *  • тонкая светящаяся граница hairline;
 *  • глубокая мягкая тень;
 *  • на вебе — настоящий backdrop-blur;
 *  • опциональное цветное свечение (glow) в цвет сна.
 */
import React from 'react';
import { Platform, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { colors, radius, shadow } from '../theme';

export interface GlassContainerProps extends ViewProps {
  /** 0..2 — яркость стекла */
  intensity?: number;
  /** радиус скругления */
  rounded?: number;
  /** цвет границы (по умолчанию — белый полупрозрачный) */
  borderColor?: string;
  /** акцентное свечение элемента (цвет сна) */
  glowColor?: string;
  /** сила свечения 0..1 */
  glowStrength?: number;
  style?: ViewStyle | ViewStyle[];
}

export function GlassContainer({
  intensity = 1,
  rounded = radius.l,
  borderColor,
  glowColor,
  glowStrength = 0.45,
  style,
  children,
  ...rest
}: GlassContainerProps) {
  const base: ViewStyle = {
    backgroundColor: `rgba(255, 255, 255, ${0.055 * intensity})`,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: borderColor ?? colors.glassBorder,
    borderRadius: rounded,
    ...shadow,
  };

  if (Platform.OS === 'web') {
    (base as Record<string, unknown>).backdropFilter = 'blur(20px) saturate(155%)';
    (base as Record<string, unknown>).WebkitBackdropFilter = 'blur(20px) saturate(155%)';
  }

  const glow: ViewStyle | null = glowColor
    ? Platform.select({
        ios: {
          shadowColor: glowColor,
          shadowOpacity: glowStrength,
          shadowRadius: 26,
          shadowOffset: { width: 0, height: 6 },
        },
        android: { elevation: 14 },
        default: {
          shadowColor: glowColor,
          shadowOpacity: glowStrength,
          shadowRadius: 26,
          shadowOffset: { width: 0, height: 6 },
        },
      }) as ViewStyle
    : null;

  return (
    <View style={[base, glow, style]} {...rest}>
      {children}
    </View>
  );
}
