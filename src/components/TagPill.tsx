/**
 * «Стеклянная пилюля» тега.
 *
 * При выборе: пружинный «поп» (1 → 1.16 → 1), граница и свечение
 * окрашиваются в акцент тега, лёгкий виброотклик.
 */
import React, { useCallback } from 'react';
import { Pressable, Text, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { GlassContainer } from './GlassContainer';
import { colors, fonts, springs } from '../theme';
import { haptic } from '../core/haptics';
import { hexToRgb } from '../core/dreamEngine';
import type { DreamTag } from '../core/tags';

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}

export interface TagPillProps {
  tag: DreamTag;
  selected: boolean;
  onToggle: (tag: DreamTag) => void;
}

export function TagPill({ tag, selected, onToggle }: TagPillProps) {
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.92, springs.snappy);
  }, [scale]);

  const onPressOut = useCallback(() => {
    // пружинный «поп» после отпускания
    scale.value = withSequence(
      withSpring(1.14, { damping: 9, mass: 0.55, stiffness: 240 }),
      withSpring(1, springs.gentle),
    );
  }, [scale]);

  const handle = useCallback(() => {
    haptic.light();
    onToggle(tag);
  }, [onToggle, tag]);

  const accent = tag.palette.accent;

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handle}
      accessibilityRole="button"
      accessibilityLabel={tag.label}
      accessibilityState={{ selected }}
    >
      <Animated.View style={pressStyle}>
        <GlassContainer
          intensity={selected ? 0.4 : 1}
          rounded={999}
          borderColor={selected ? rgba(accent, 0.65) : undefined}
          glowColor={selected ? accent : undefined}
          glowStrength={selected ? 0.55 : 0}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 9,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            backgroundColor: selected ? rgba(accent, 0.16) : undefined,
          }}
        >
          <Text style={{ fontSize: 13.5 }}>{tag.emoji}</Text>
          <Text
            style={{
              fontFamily: selected ? fonts.bodyBold : fonts.bodyMedium,
              fontSize: 13.5,
              color: selected ? colors.text : colors.textDim,
              letterSpacing: 0.2,
            }}
          >
            {tag.label}
          </Text>
        </GlassContainer>
      </Animated.View>
    </Pressable>
  );
}

export function tagPillStyle(): ViewStyle {
  return { marginRight: 0 };
}
