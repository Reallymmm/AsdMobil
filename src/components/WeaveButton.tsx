/**
 * «Соткать сон» — пульсирующая стеклянная кнопка с внутренним свечением.
 *
 * Внутри живёт «сердцебиение»: мягкая светящаяся сердцевина дышит
 * (медленный ping-pong), при нажатии — пружинное сжатие и heavy-хаптика.
 * Если не выбран ни тег, ни название — кнопка «дрожит» и подсказывает.
 */
import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, springs } from '../theme';
import { haptic } from '../core/haptics';

export interface WeaveButtonProps {
  onPress: () => void;
  /** акцентный цвет свечения (акцент текущей палитры сна) */
  glowColor: string;
  disabled?: boolean;
  label?: string;
}

const PULSE_MS = 1600;

export function WeaveButton({
  onPress,
  glowColor,
  disabled = false,
  label = '✦ СОТКАТЬ СОН',
}: WeaveButtonProps) {
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);
  const breath = useSharedValue(0);
  const pulse = useSharedValue(0);

  // бесконечное «дыхание» свечения
  React.useEffect(() => {
    breath.value = withRepeat(withTiming(1, { duration: PULSE_MS }), -1, true);
    pulse.value = withRepeat(withTiming(1, { duration: PULSE_MS * 0.75 }), -1, true);
    return () => {
      cancelAnimation(breath);
      cancelAnimation(pulse);
    };
  }, [breath, pulse]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shake.value }],
  }));

  const glowStyle = useAnimatedStyle(() => {
    'worklet';
    const b = breath.value; // 0..1
    return {
      opacity: (0.35 + 0.4 * b) * (disabled ? 0.3 : 1),
      transform: [{ scale: 0.94 + 0.08 * b }],
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    'worklet';
    const p = pulse.value; // 0..1
    return {
      opacity: (1 - p) * 0.5 * (disabled ? 0.25 : 1),
      transform: [{ scale: 0.98 + 0.16 * p }],
    };
  });

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.955, springs.snappy);
  }, [scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSequence(
      withSpring(1.03, { damping: 10, mass: 0.6, stiffness: 210 }),
      withSpring(1, springs.gentle),
    );
  }, [scale]);

  const handle = useCallback(() => {
    if (disabled) {
      haptic.warning();
      shake.value = withSequence(
        withSpring(-7, { damping: 8, mass: 0.4, stiffness: 300 }),
        withSpring(6, { damping: 8, mass: 0.4, stiffness: 300 }),
        withSpring(-3, { damping: 8, mass: 0.4, stiffness: 300 }),
        withSpring(0, springs.gentle),
      );
      return;
    }
    haptic.heavy();
    onPress();
  }, [disabled, onPress, shake]);

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handle}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ alignSelf: 'stretch' }}
    >
      <Animated.View style={pressStyle}>
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1.2,
            borderColor: disabled ? 'rgba(255,255,255,0.14)' : glowColor,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 17,
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        >
          {/* пульсирующее внутреннее свечение */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: '12%',
                right: '12%',
                top: 2,
                bottom: 2,
                borderRadius: 999,
                backgroundColor: glowColor,
                opacity: 0.4,
              },
              glowStyle,
            ]}
          />
          {/* расходящееся кольцо */}
          {!disabled ? (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  left: '6%',
                  right: '6%',
                  top: 4,
                  bottom: 4,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: glowColor,
                },
                ringStyle,
              ]}
            />
          ) : null}
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 15,
              letterSpacing: 1.5,
              color: disabled ? colors.textFaint : colors.text,
              textShadowColor: disabled ? 'transparent' : glowColor,
              textShadowRadius: 14,
              textShadowOffset: { width: 0, height: 0 },
            }}
          >
            {label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}
