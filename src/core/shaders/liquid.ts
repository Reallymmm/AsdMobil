import { NOISE_SKSL } from './noise';

/**
 * «Жидкий градиент» — фоновый шейдер приложения.
 * Классический domain warping (по мотивам техник Иньиго Килеса):
 * fbm(p + warp·fbm(p + warp·fbm(p))) — двухступенчатое искажение шумового поля.
 *
 * Параметры из тегов:
 *  u_deep / u_mid / u_accent — палитра сна
 *  u_speed  — скорость дрейфа (Кошмар → быстро, Покой → медленно)
 *  u_warp   — плотность/турбулентность поля
 *  u_energy — 0 = приглушённый ambient-фон, 1 = насыщенный режим
 */
export const LIQUID_SKSL = /* glsl */ `
uniform float2 u_res;
uniform float u_time;
uniform float3 u_deep;
uniform float3 u_mid;
uniform float3 u_accent;
uniform float u_speed;
uniform float u_warp;
uniform float u_energy;

` +
  NOISE_SKSL +
  /* glsl */ `
vec4 main(vec2 coord) {
  float mn = min(u_res.x, u_res.y);
  vec2 p = coord / mn;
  float t = u_time * (0.08 + 0.16 * u_speed);

  // общий медленный дрейф поля
  p += 0.22 * float2(cos(t * 0.9 + 1.7), sin(t * 1.1 + 0.4));

  // двухступенчатый domain warp
  vec2 q = float2(
    fbm(p + float2(0.0, 0.5) + 0.14 * t),
    fbm(p + float2(5.2, 1.3) - 0.11 * t)
  );
  vec2 r = float2(
    fbm(p + u_warp * q + float2(1.7, 9.2) + 0.17 * t),
    fbm(p + u_warp * q + float2(8.3, 2.8) - 0.13 * t)
  );
  float f = fbm(p + u_warp * r);

  // цветовое смешивание: тёмная глубина → середина → светящиеся «вены»
  float m1 = clamp(f * f * 2.8, 0.0, 1.0);
  vec3 col = mix(u_deep, u_mid, m1);

  float vein = pow(clamp((length(r) - 0.38) * 1.4, 0.0, 1.0), 1.7);
  col = mix(col, u_accent, vein * (0.45 + 0.4 * u_energy));

  // мягкая светимость по «гребням» поля
  col += u_accent * pow(clamp(f - 0.62, 0.0, 1.0) * 2.2, 2.0) * 0.22 * (0.4 + 0.6 * u_energy);

  // виньетка к краям
  float2 c = coord / u_res - 0.5;
  float vig = 1.0 - dot(c, c) * 1.25;
  col *= clamp(vig, 0.32, 1.0);

  // лёгкое плёночное зерно против бандинга
  float g = hash21(coord * 0.7 + fract(u_time) * 61.7);
  col += (g - 0.5) * 0.032;

  return vec4(col, 1.0);
}
`;
