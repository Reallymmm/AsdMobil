/**
 * Общие хуки генеративной анимации.
 *
 * useClock        — общий «ход времени» для шейдеров (UI-поток, 60 fps).
 * useSmoothParams — плавная интерполяция визуального профиля: когда
 *                   пользователь выбирает тег, цвета не прыгают, а
 *                   «перетекают» (экспоненциальное сглаживание).
 * useSizeShared   — зеркало размеров окна в shared value (для worklet'ов).
 */
import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { DreamParams } from '../core/dreamEngine';

export type SharedParams = SharedValue<DreamParams>;

export function useClock(): SharedValue<number> {
  const clock = useSharedValue(0);
  useFrameCallback((frame) => {
    'worklet';
    clock.value += (frame.timeSincePreviousFrame ?? 16) / 1000;
  });
  return clock;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function useSmoothParams(target: DreamParams, k = 0.09): SharedParams {
  const targetSv = useSharedValue<DreamParams>(target);
  const current = useSharedValue<DreamParams>(target);

  useEffect(() => {
    targetSv.value = target;
  }, [target, targetSv]);

  useFrameCallback(() => {
    'worklet';
    const t = targetSv.value;
    const c = current.value;
    current.value = {
      deep: { r: lerp(c.deep.r, t.deep.r, k), g: lerp(c.deep.g, t.deep.g, k), b: lerp(c.deep.b, t.deep.b, k) },
      mid: { r: lerp(c.mid.r, t.mid.r, k), g: lerp(c.mid.g, t.mid.g, k), b: lerp(c.mid.b, t.mid.b, k) },
      accent: { r: lerp(c.accent.r, t.accent.r, k), g: lerp(c.accent.g, t.accent.g, k), b: lerp(c.accent.b, t.accent.b, k) },
      speed: lerp(c.speed, t.speed, k),
      warp: lerp(c.warp, t.warp, k),
      particles: lerp(c.particles, t.particles, k),
    };
  });

  return current;
}

export interface SharedSize {
  w: number;
  h: number;
}

export function useSizeShared(): SharedValue<SharedSize> {
  const dims = useWindowDimensions();
  const size = useSharedValue<SharedSize>({ w: dims.width, h: dims.height });
  useEffect(() => {
    size.value = { w: dims.width, h: dims.height };
  }, [dims.width, dims.height, size]);
  return size;
}

/** Рабочие (worklet) хелперы для сборки uniform-массивов из DreamParams. */
export function uniformsFromParams(p: DreamParams) {
  'worklet';
  return {
    deep: [p.deep.r, p.deep.g, p.deep.b],
    mid: [p.mid.r, p.mid.g, p.mid.b],
    accent: [p.accent.r, p.accent.g, p.accent.b],
    speed: p.speed,
    warp: p.warp,
    particles: p.particles,
  };
}

export function derivedParams(style: 'liquid' | 'sphere' | 'visualizer') {
  'worklet';
  return style;
}

export { useDerivedValue };
