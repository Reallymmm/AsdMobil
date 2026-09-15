import { NOISE_SKSL } from './noise';

/**
 * «Призма» — парящая стеклянная сфера на экране записи сна.
 *
 * Иллюзия 3D-стекла в одном фрагментном шейдере:
 *  • нормаль сферы n = (uv, sqrt(1-d²)) — для бликов и френеля;
 *  • «преломление» — изгиб координат выборки к центру у краёв (линза),
 *    внутри — тот же жидкий fbm-градиент, что и в теме сна;
 *  • вращение внутреннего флюида по времени;
 *  • френелевский светящийся ободок + specular-блик;
 *  • мягкое гало вокруг сферы (alpha затухает наружу).
 */
export const SPHERE_SKSL = /* glsl */ `
uniform float2 u_res;
uniform float u_time;
uniform float2 u_center;
uniform float u_radius;
uniform float3 u_deep;
uniform float3 u_mid;
uniform float3 u_accent;
uniform float u_speed;
uniform float u_warp;

` +
  NOISE_SKSL +
  /* glsl */ `
vec4 main(vec2 coord) {
  float2 uv = (coord - u_center) / u_radius;
  float d = length(uv);

  // гало вокруг сферы (для d > 1), внутри ограничено
  float halo = exp(-(max(d, 1.0) - 1.0) * 3.4) * 0.5;
  float inside = 1.0 - smoothstep(0.985, 1.003, d);

  // нормаль сферы (экранное Y направлено вниз — берём -y)
  float zz = sqrt(max(0.0, 1.0 - clamp(d * d, 0.0, 1.0)));
  float3 n = float3(uv.x, -uv.y, zz);

  // вращение внутреннего флюида
  float ang = u_time * (0.22 + 0.30 * u_speed);
  float ca = cos(ang);
  float sa = sin(ang);
  float2 rv = mat2(ca, sa, -sa, ca) * uv;

  // «преломление»: у краёв выборка смещается к центру (эффект линзы)
  float bend = 0.62 * pow(1.0 - zz, 1.9);
  float2 suv = rv * (1.0 - bend);

  // внутренняя жидкость — плотный domain warp
  float t = u_time * (0.18 + 0.32 * u_speed);
  vec2 p = suv * (1.5 + 1.6 * u_warp);
  vec2 q = float2(
    fbm(p + float2(0.0, 0.8) + 0.35 * t),
    fbm(p + float2(3.7, 1.9) - 0.27 * t)
  );
  vec2 rr = float2(
    fbm(p + 1.9 * q + float2(1.2, 6.4) + 0.31 * t),
    fbm(p + 1.9 * q + float2(7.1, 3.3) - 0.24 * t)
  );
  float f = fbm(p + 1.9 * rr);

  vec3 col = mix(u_deep, u_mid, clamp(f * f * 3.0, 0.0, 1.0));
  col = mix(col, u_accent, pow(clamp(f * 1.12, 0.0, 1.0), 3.1) * 0.95);

  // яркая каустика в ядре
  col += u_accent * exp(-d * d * 5.5) * 0.38;

  // френелевский ободок
  float fres = pow(1.0 - zz, 3.0);
  col += u_accent * fres * 1.15;
  col += float3(0.88, 0.94, 1.0) * fres * 0.22;

  // specular-блик (свет сверху-слева) + мягкая контровая подсветка
  float3 L = normalize(float3(-0.45, -0.72, 0.52));
  col += float3(1.0) * pow(max(dot(n, L), 0.0), 96.0) * 0.95;
  col += u_mid * pow(max(dot(n, normalize(float3(0.55, 0.75, 0.36))), 0.0), 12.0) * 0.30;

  // сборка: внутри — сфера, снаружи — цвет гало (premultiplied alpha)
  float3 haloCol = mix(u_accent, float3(1.0), 0.35);
  float mixIn = clamp(inside * 1.8, 0.0, 1.0);
  float3 outc = mix(haloCol, col, mixIn);
  float alpha = clamp(halo + inside, 0.0, 1.0);

  // зернистость на границе стекла
  float g = hash21(coord * 0.9 + 17.3);
  outc += (g - 0.5) * 0.02 * (1.0 - mixIn);

  return vec4(outc * alpha, alpha);
}
`;
