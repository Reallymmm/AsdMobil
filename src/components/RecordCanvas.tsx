/**
 * Сцена записи сна: один Canvas = жидкий фон + парящая стеклянная сфера.
 *
 * Сфера «дышит»: медленно покачивается (sin-дрейф) и пульсирует радиусом,
 * внутренний флюид вращается со скоростью из профиля тегов. Палитра
 * перетекает в реальном времени при выборе тегов (useSmoothParams).
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Fill, Shader } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { liquidFx, sphereFx } from '../core/shaders/effects';
import type { DreamParams } from '../core/dreamEngine';
import { useClock, useSmoothParams, useSizeShared, type SharedParams } from './animation';

export interface RecordCanvasProps {
  params: DreamParams;
  /** вертикальная позиция центра сферы (доля высоты экрана) */
  sphereCenterYRatio?: number;
  /** доля минимальной стороны экрана в радиусе сферы */
  sphereRadiusRatio?: number;
}

export function RecordCanvas({
  params,
  sphereCenterYRatio = 0.30,
  sphereRadiusRatio = 0.24,
}: RecordCanvasProps) {
  const clock = useClock();
  const smooth: SharedParams = useSmoothParams(params);
  const size = useSizeShared();

  const bgUniforms = useDerivedValue(() => {
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
      u_energy: 0.2,
    };
  });

  const sphereUniforms = useDerivedValue(() => {
    'worklet';
    const p = smooth.value;
    const { w, h } = size.value;
    const t = clock.value;
    const mn = Math.min(w, h);
    const r = Math.min(Math.max(mn * sphereRadiusRatio, 96), 190);
    const cy =
      h * sphereCenterYRatio + Math.sin(t * 0.65) * 9 + Math.sin(t * 0.23) * 5;
    const rr = r * (1 + 0.018 * Math.sin(t * 1.1));
    return {
      u_res: [w, h],
      u_time: t,
      u_center: [w / 2, cy],
      u_radius: rr,
      u_deep: [p.deep.r, p.deep.g, p.deep.b],
      u_mid: [p.mid.r, p.mid.g, p.mid.b],
      u_accent: [p.accent.r, p.accent.g, p.accent.b],
      u_speed: p.speed,
      u_warp: p.warp,
    };
  });

  return (
    <Canvas style={styles.fill} pointerEvents="none">
      <Fill>
        {liquidFx ? <Shader source={liquidFx} uniforms={bgUniforms as never} /> : null}
      </Fill>
      <Fill>
        {sphereFx ? <Shader source={sphereFx} uniforms={sphereUniforms as never} /> : null}
      </Fill>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
