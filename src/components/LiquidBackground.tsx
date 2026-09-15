/**
 * Ambient-фон приложения: fullscreen Canvas с «жидким» шейдером.
 * Висит за интерфейсом (pointerEvents none), параметры — из профиля сна.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Fill, Shader } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { liquidFx } from '../core/shaders/effects';
import type { DreamParams } from '../core/dreamEngine';
import { useClock, useSmoothParams, useSizeShared, type SharedParams } from './animation';

export interface LiquidBackgroundProps {
  params: DreamParams;
  /** 0..1 — насыщенность фона (за экранами интерфейса — приглушённо) */
  energy?: number;
}

export function LiquidBackground({ params, energy = 0.22 }: LiquidBackgroundProps) {
  const clock = useClock();
  const smooth: SharedParams = useSmoothParams(params);
  const size = useSizeShared();

  const uniforms = useDerivedValue(() => {
    'worklet';
    const p = smooth.value;
    const { w, h } = size.value;
    return {
      u_res: [w, h],
      u_time: clock.value,
      u_deep: [p.deep.r, p.deep.g, p.deep.b],
      u_mid: [p.mid.r, p.mid.g, p.mid.b],
      u_accent: [p.accent.r, p.accent.g, p.accent.b],
      u_speed: p.speed,
      u_warp: p.warp,
      u_energy: energy,
    };
  });

  return (
    <Canvas style={styles.fill} pointerEvents="none">
      <Fill>
        {liquidFx ? <Shader source={liquidFx} uniforms={uniforms as never} /> : null}
      </Fill>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
