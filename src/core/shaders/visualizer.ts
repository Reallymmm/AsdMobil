import { NOISE_SKSL } from './noise';

/**
 * «Жидкий сон» — полноэкранный интерактивный визуализатор.
 *
 * Экран целиком залит жидким полем, параметры которого заданы тегами сна
 * (палитра, скорость, турбулентность, плотность «звёздной пыли»).
 *
 * Интерактив — до 4 одновременных касаний (uniform-массив u_touch):
 *  • vortex  — закрутка поля вокруг пальца (завихрение жидкости);
 *  • ripple  — расходящаяся кольцевая волна с экспоненциальным затуханием;
 *  • glow    — мягкое свечение в точке касания.
 *
 * Виньетка по краям имитирует «запотевшее стекло».
 */
export const VISUALIZER_SKSL = /* glsl */ `
uniform float2 u_res;
uniform float u_time;
uniform float3 u_deep;
uniform float3 u_mid;
uniform float3 u_accent;
uniform float u_speed;
uniform float u_warp;
uniform float u_particles;
uniform float4 u_touch[4];

` +
  NOISE_SKSL +
  /* glsl */ `
vec4 main(vec2 coord) {
  float mn = min(u_res.x, u_res.y);
  float t = u_time * (0.10 + 0.24 * u_speed);

  vec2 p = coord / mn;
  float2 rippleWarp = float2(0.0);
  float lightAdd = 0.0;

  // --- касания: вихрь + волна + свечение -------------------------------
  for (int i = 0; i < 4; i++) {
    float4 T = u_touch[i];
    if (T.w > 0.003) {
      vec2 tc = T.xy / mn;
      vec2 rel = p - tc;
      float dist = length(rel) + 1e-4;
      float age = max(u_time - T.z, 0.0);
      float decay = exp(-age * 0.55) * T.w;

      // вихрь: закрутка поля вокруг точки касания
      float swz = decay * exp(-dist * 5.0) * 2.7;
      float c1 = cos(swz);
      float s1 = sin(swz);
      p = tc + mat2(c1, s1, -s1, c1) * rel;

      // расходящаяся кольцевая волна
      float ring = sin(dist * 30.0 - age * 16.0)
                 * exp(-dist * 4.5)
                 * smoothstep(0.0, 0.04, age);
      rippleWarp += (rel / dist) * ring * decay * 0.055;

      // мягкое свечение под пальцем
      lightAdd += exp(-dist * dist * 70.0) * decay * 0.5;
    }
  }
  p += rippleWarp;

  // --- жидкое поле (domain warping) -------------------------------------
  p += 0.16 * float2(cos(t * 0.8 + 2.1), sin(t * 1.0));

  vec2 q = float2(
    fbm(p + float2(0.0, 0.6) + 0.15 * t),
    fbm(p + float2(5.2, 1.3) - 0.12 * t)
  );
  vec2 r = float2(
    fbm(p + u_warp * q + float2(1.7, 9.2) + 0.18 * t),
    fbm(p + u_warp * q + float2(8.3, 2.8) - 0.14 * t)
  );
  float f = fbm(p + u_warp * r);

  float m1 = clamp(f * f * 3.0, 0.0, 1.0);
  vec3 col = mix(u_deep, u_mid, m1);

  float vein = pow(clamp((length(r) - 0.36) * 1.5, 0.0, 1.0), 1.6);
  col = mix(col, u_accent, vein * 0.85);

  col += u_accent * pow(clamp(f - 0.58, 0.0, 1.0) * 2.3, 2.0) * 0.30;

  // свечение от касаний
  col += mix(u_accent, float3(1.0), 0.45) * lightAdd;

  // --- «звёздная пыль» (плотность из тегов, напр. Космос) ---------------
  float2 sp = coord / 24.0;
  float2 cell = floor(sp);
  float h = hash21(cell + 7.31);
  float thr = 1.0 - 0.034 * u_particles;
  float star = smoothstep(thr, thr + 0.004, h);
  float2 cellPos = fract(sp) - 0.5;
  float core = exp(-dot(cellPos, cellPos) * 34.0);
  float tw = 0.55 + 0.45 * sin(u_time * (1.2 + h * 2.6) + h * 43.0);
  col += float3(0.85, 0.92, 1.0) * star * core * tw * 0.9 * (0.35 + 0.65 * (1.0 - m1));

  // --- виньетка «запотевшего стекла» ------------------------------------
  float2 vc = (coord - 0.5 * u_res) / (0.55 * mn);
  float vig = smoothstep(0.72, 1.42, length(vc));
  col = mix(col, col * 0.62 + float3(0.60, 0.70, 0.90) * 0.14, vig * 0.55);

  // зерно
  float g = hash21(coord * 0.7 + fract(u_time) * 61.7);
  col += (g - 0.5) * 0.030;

  return vec4(col, 1.0);
}
`;
