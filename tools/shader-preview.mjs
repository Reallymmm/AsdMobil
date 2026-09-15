/**
 * Оффлайн-превью шейдеров LUCID (без запуска приложения).
 *
 * Рендерит PNG-кадры всех эффектов в tools/out/ через Node + CanvasKit
 * (тот же WASM-движок, что использует Skia в веб-версии приложения).
 *
 *   node tools/shader-preview.mjs
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CanvasKitInit from 'canvaskit-wasm/bin/full/canvaskit.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const require2 = createRequire(path.join(repo, 'index.js'));
const ts = require2('typescript');

// --- загрузка TS-модулей шейдеров без сборки --------------------------------
const cache = {};
function loadShaderModule(relPath) {
  if (cache[relPath]) return cache[relPath];
  const src = fs.readFileSync(path.join(repo, relPath), 'utf8');
  const out = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  const req = (name) =>
    loadShaderModule(path.join(path.dirname(relPath), name).replace(/\.ts$/, '') + '.ts');
  new Function('require', 'module', 'exports', out)(req, mod, mod.exports);
  cache[relPath] = mod.exports;
  return mod.exports;
}

const liquidSrc = loadShaderModule('src/core/shaders/liquid.ts').LIQUID_SKSL;
const sphereSrc = loadShaderModule('src/core/shaders/sphere.ts').SPHERE_SKSL;
const vizSrc = loadShaderModule('src/core/shaders/visualizer.ts').VISUALIZER_SKSL;

const CanvasKit = await CanvasKitInit({
  locateFile: (f) => path.join(repo, 'node_modules', 'canvaskit-wasm', 'bin', 'full', f),
});

function compile(name, src) {
  let err = null;
  const effect = CanvasKit.RuntimeEffect.Make(src, (e) => { err = e; });
  if (!effect) {
    console.error(`✗ ${name}: ошибка компиляции\n${err}`);
    process.exit(1);
  }
  console.log(`✓ ${name}`);
  return effect;
}

const liqFx = compile('liquid', liquidSrc);
const sphFx = compile('sphere', sphereSrc);
const vizFx = compile('visualizer', vizSrc);

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

function flatUniforms(effect, obj) {
  const out = [];
  for (let i = 0; i < effect.getUniformCount(); i++) {
    const name = effect.getUniformName(i);
    const u = effect.getUniform(i);
    const v = obj[name];
    if (typeof v === 'number') out.push(v);
    else if (u.columns === 4) out.push(...v.flat());
    else out.push(...v);
  }
  return out;
}

const W = 390, H = 780;
const T = 3.2;
const OUT = path.join(here, 'out');
fs.mkdirSync(OUT, { recursive: true });

function render(name, layers) {
  const surface = CanvasKit.MakeSurface(W, H);
  const canvas = surface.getCanvas();
  canvas.clear(CanvasKit.BLACK);
  for (const { effect, uniforms } of layers) {
    const shader = effect.makeShader(flatUniforms(effect, uniforms));
    const paint = new CanvasKit.Paint();
    paint.setAntiAlias(true);
    paint.setShader(shader);
    canvas.drawRect(CanvasKit.LTRBRect(0, 0, W, H), paint);
    paint.delete();
    shader.delete();
  }
  const img = surface.makeImageSnapshot();
  fs.writeFileSync(path.join(OUT, `${name}.png`), img.encodeToBytes(CanvasKit.ImageFormat.PNG, 95));
  img.delete();
  surface.delete();
  console.log('→', path.join(OUT, `${name}.png`));
}

// пресеты палитр (аналог профилей тегов)
const P = (deep, mid, accent) => ({
  u_deep: hex(deep), u_mid: hex(mid), u_accent: hex(accent),
});
const calm = P('#03111C', '#0B5566', '#7DE8E0');
const fire = P('#160409', '#7A0E1E', '#FF5A2A');
const space = P('#050718', '#241A5E', '#9D7BFF');
const RES = [W, H];
const NO_TOUCH = [[-999, -999, 0, 0], [-999, -999, 0, 0], [-999, -999, 0, 0], [-999, -999, 0, 0]];

render('bg-calm', [{ effect: liqFx, uniforms: { u_res: RES, u_time: T, ...calm, u_speed: 0.32, u_warp: 0.55, u_energy: 0.25 } }]);
render('bg-fire', [{ effect: liqFx, uniforms: { u_res: RES, u_time: T, ...fire, u_speed: 1.6, u_warp: 1.5, u_energy: 0.35 } }]);

const sphere = (pal, speed, warp) => [
  { effect: liqFx, uniforms: { u_res: RES, u_time: T, ...pal, u_speed: speed * 0.7, u_warp: warp, u_energy: 0.25 } },
  { effect: sphFx, uniforms: { u_res: RES, u_time: T, u_center: [W / 2, H * 0.32], u_radius: 110, ...pal, u_speed: speed, u_warp: warp } },
];
render('sphere-calm', sphere(calm, 0.35, 0.55));
render('sphere-fire', sphere(fire, 1.4, 1.4));
render('sphere-space', sphere(space, 0.4, 0.5));

const touch = [[130, 220, T - 0.3, 1.0], [280, 520, T - 1.2, 1.0], [-999, -999, 0, 0], [-999, -999, 0, 0]];
render('viz-calm-touch', [{ effect: vizFx, uniforms: { u_res: RES, u_time: T, ...calm, u_speed: 0.4, u_warp: 0.7, u_particles: 0.5, u_touch: touch } }]);
render('viz-space-stars', [{ effect: vizFx, uniforms: { u_res: RES, u_time: T, ...space, u_speed: 0.35, u_warp: 0.5, u_particles: 1.0, u_touch: NO_TOUCH } }]);
render('viz-fire', [{ effect: vizFx, uniforms: { u_res: RES, u_time: T, ...fire, u_speed: 1.8, u_warp: 1.6, u_particles: 0.3, u_touch: NO_TOUCH } }]);

console.log('Готово: PNG-кадры в tools/out/');
