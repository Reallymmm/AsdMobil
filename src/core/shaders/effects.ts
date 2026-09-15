/**
 * Компиляция RuntimeEffect'ов (один раз при старте).
 * Если компиляция внезапно не удалась — компоненты рисуют фолбэк-заливку.
 */
import { Skia } from '@shopify/react-native-skia';
import { LIQUID_SKSL } from './liquid';
import { SPHERE_SKSL } from './sphere';
import { VISUALIZER_SKSL } from './visualizer';

export const liquidFx = Skia.RuntimeEffect.Make(LIQUID_SKSL) ?? null;
export const sphereFx = Skia.RuntimeEffect.Make(SPHERE_SKSL) ?? null;
export const visualizerFx = Skia.RuntimeEffect.Make(VISUALIZER_SKSL) ?? null;
