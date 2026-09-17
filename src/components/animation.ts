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

export function useSmoothParams(target: DreamParams, k = 0.09): SharedParams {
  const targetSv = useSharedValue<DreamParams>(target);
  const current = useSharedValue<DreamParams>(target);

  useEffect(() => {
    targetSv.value = target;
  }, [target, targetSv]);

  useFrameCallback(() => {
    'worklet';
    // ВАЖНО: интерполяция объявлена ВНУТРИ ворклета. На Android/iOS ворклет
    // выполняется в UI-runtime, откуда нельзя синхронно вызывать функции
    // JS-контекста («Tried to synchronously call a Remote Function»).
    const lp = (a: number, b: number) => a + (b - a) * k;
    const t = targetSv.value;
    const c = current.value;
    current.value = {
      deep: { r: lp(c.deep.r, t.deep.r), g: lp(c.deep.g, t.deep.g), b: lp(c.deep.b, t.deep.b) },
      mid: { r: lp(c.mid.r, t.mid.r), g: lp(c.mid.g, t.mid.g), b: lp(c.mid.b, t.mid.b) },
      accent: { r: lp(c.accent.r, t.accent.r), g: lp(c.accent.g, t.accent.g), b: lp(c.accent.b, t.accent.b) },
      speed: lp(c.speed, t.speed),
      warp: lp(c.warp, t.warp),
      particles: lp(c.particles, t.particles),
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
