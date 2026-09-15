/**
 * «Жидкий сон» — интерактивный полноэкранный визуализатор.
 *
 * Касания пальцев превращаются в волны и завихрения жидкости:
 * до 4 одновременных касаний (слоты u_touch в шейдере).
 * Пока палец прижат — вокруг него закручивается вихрь; после
 * отпускания сила экспоненциально затухает (полураспад ~0.5 c).
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Fill, Shader } from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { visualizerFx } from '../core/shaders/effects';
import type { DreamParams } from '../core/dreamEngine';
import { haptic } from '../core/haptics';
import { useClock, useSmoothParams, useSizeShared, type SharedParams } from './animation';

type TouchPoint = [number, number, number, number]; // x, y, t0, strength

interface TouchState {
  points: TouchPoint[];
  active: number[];
}

const DEAD: TouchPoint = [-9999, -9999, 0, 0];

export interface VisualizerCanvasProps {
  params: DreamParams;
  /** вызывается при первом касании (чтобы спрятать подсказку) */
  onTouch?: () => void;
}

export function VisualizerCanvas({ params, onTouch }: VisualizerCanvasProps) {
  const clock = useClock();
  const smooth: SharedParams = useSmoothParams(params, 0.07);
  const size = useSizeShared();

  const touches = useSharedValue<TouchState>({
    points: [DEAD, DEAD, DEAD, DEAD],
    active: [0, 0, 0, 0],
  });
  const slotByPointer = useRef<Map<number, number>>(new Map());

  // затухание отпущенных касаний
  useFrameCallback((frame) => {
    'worklet';
    const dt = (frame.timeSincePreviousFrame ?? 16) / 1000;
    const st = touches.value;
    let changed = false;
    const pts = st.points.map((p, i): TouchPoint => {
      if (st.active[i] === 0 && p[3] > 0.001) {
        changed = true;
        const s = p[3] * Math.exp(-dt / 0.5);
        return [p[0], p[1], p[2], s < 0.02 ? 0 : s];
      }
      return p;
    });
    if (changed) {
      touches.value = { points: pts, active: st.active };
    }
  });

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
      u_particles: p.particles,
      u_touch: touches.value.points,
    };
  });

  const claimSlot = useCallback((): number => {
    const st = touches.value;
    let idx = st.active.findIndex((a) => a === 0);
    if (idx === -1) {
      // все слоты заняты — вытесняем самое старое касание
      let oldest = 0;
      for (let i = 1; i < 4; i++) {
        if (st.points[i][2] < st.points[oldest][2]) oldest = i;
      }
      idx = oldest;
    }
    return idx;
  }, [touches]);

  const handleGrant = useCallback(
    (e: { nativeEvent: { identifier: number; locationX: number; locationY: number } }) => {
      const { identifier, locationX, locationY } = e.nativeEvent;
      const idx = claimSlot();
      const st = touches.value;
      const points = [...st.points] as TouchPoint[];
      const active = [...st.active];
      points[idx] = [locationX, locationY, clock.value, 1];
      active[idx] = 1;
      touches.value = { points, active };
      slotByPointer.current.set(identifier, idx);
      haptic.light();
      onTouch?.();
    },
    [claimSlot, clock, onTouch, touches],
  );

  const handleMove = useCallback(
    (e: { nativeEvent: { touches?: Array<{ identifier: number; locationX: number; locationY: number }> } }) => {
      const all = e.nativeEvent.touches;
      if (!all || all.length === 0) return;
      const st = touches.value;
      const points = [...st.points] as TouchPoint[];
      let changed = false;
      for (const t of all) {
        const idx = slotByPointer.current.get(t.identifier);
        if (idx !== undefined && st.active[idx] === 1) {
          points[idx] = [t.locationX, t.locationY, points[idx][2], points[idx][3]];
          changed = true;
        }
      }
      if (changed) touches.value = { points, active: [...st.active] };
    },
    [touches],
  );

  const handleRelease = useCallback(
    (e: { nativeEvent: { changedTouches?: Array<{ identifier: number }> } }) => {
      const changedIds = e.nativeEvent.changedTouches;
      const st = touches.value;
      const active = [...st.active];
      let changed = false;
      const ids =
        changedIds && changedIds.length > 0
          ? changedIds
          : [...slotByPointer.current.keys()].map((identifier) => ({ identifier }));
      for (const { identifier } of ids) {
        const idx = slotByPointer.current.get(identifier);
        if (idx !== undefined) {
          active[idx] = 0;
          slotByPointer.current.delete(identifier);
          changed = true;
        }
      }
      if (changed) touches.value = { points: [...st.points], active };
    },
    [touches],
  );

  const responderProps = useMemo(
    () => ({
      onStartShouldSetResponder: () => true,
      onResponderGrant: handleGrant as never,
      onResponderMove: handleMove as never,
      onResponderRelease: handleRelease as never,
      onResponderTerminate: handleRelease as never,
      onResponderTerminationRequest: () => false,
    }),
    [handleGrant, handleMove, handleRelease],
  );

  return (
    <View style={styles.fill} {...responderProps}>
      <Canvas style={styles.fill}>
        <Fill>
          {visualizerFx ? <Shader source={visualizerFx} uniforms={uniforms as never} /> : null}
        </Fill>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
