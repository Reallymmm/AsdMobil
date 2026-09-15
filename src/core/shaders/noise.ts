/**
 * Общая SkSL-библиотека шума для всех шейдеров LUCID.
 * Используется как «строительный блок» генеративного движка:
 * hash → value noise → fbm (5 октав) → domain warping в основных шейдерах.
 */
export const NOISE_SKSL = /* glsl */ `
// Классический sin-hash: равномерно распределён даже на целочисленной
// решётке (важно для ячеек «звёздной пыли» и углов value-noise).
float hash21(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + float2(1.0, 0.0));
  float c = hash21(i + float2(0.0, 1.0));
  float d = hash21(i + float2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(float2 p) {
  float v = 0.0;
  float a = 0.52;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = mat2(0.8, 0.6, -0.6, 0.8) * p * 2.03 + float2(3.7, 1.3);
    a *= 0.5;
  }
  return v;
}
`;
