/**
 * Стеклянные кнопки с пружинным откликом (spring) и тактильностью.
 */
import React, { useCallback } from 'react';
import { Pressable, Text, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { GlassContainer } from './GlassContainer';
import { colors, fonts, radius, springs } from '../theme';
import { haptic, type HapticKind } from '../core/haptics';

export interface GlassButtonProps {
  label: string;
  onPress: () => void;
  hapticKind?: HapticKind;
  glowColor?: string;
  variant?: 'pill' | 'round';
  icon?: string;
  textStyle?: TextStyle | TextStyle[];
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
}

export function GlassButton({
  label,
  onPress,
  hapticKind = 'medium',
  glowColor,
  variant = 'pill',
  icon,
  textStyle,
  style,
  disabled = false,
}: GlassButtonProps) {
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(variant === 'round' ? 0.88 : 0.94, springs.snappy);
    haptic[hapticKind]();
  }, [scale, variant, hapticKind]);

  const onPressOut = useCallback(() => {
    scale.value = withSequence(
      withSpring(1.035, { damping: 10, mass: 0.5, stiffness: 220 }),
      withSpring(1, springs.snappy),
    );
  }, [scale]);

  const handlePress = useCallback(() => {
    if (!disabled) onPress();
  }, [disabled, onPress]);

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
    >
      <Animated.View style={[pressStyle, style, { opacity: disabled ? 0.55 : 1 }]}>
        <GlassContainer
          intensity={1.15}
          rounded={variant === 'round' ? 999 : radius.pill}
          glowColor={glowColor}
          glowStrength={0.4}
          style={{
            paddingHorizontal: variant === 'round' ? 0 : 18,
            paddingVertical: variant === 'round' ? 0 : 11,
            minWidth: variant === 'round' ? 46 : undefined,
            minHeight: variant === 'round' ? 46 : undefined,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          }}
        >
          {icon ? (
            <Text style={{ fontSize: 15, color: colors.text, lineHeight: 20 }}>{icon}</Text>
          ) : null}
          <Text
            style={[
              {
                fontFamily: fonts.bodyBold,
                fontSize: 14.5,
                color: colors.text,
                letterSpacing: 0.3,
              },
              textStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </GlassContainer>
      </Animated.View>
    </Pressable>
  );
}
