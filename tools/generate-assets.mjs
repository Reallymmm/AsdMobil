/**
 * Генератор фирменных ассетов LUCID — иконки рисуются СОБСТВЕННЫМИ
 * шейдерами приложения (жидкий фон + стеклянная сфера) через CanvasKit.
 *
 *   node tools/generate-assets.mjs
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

const CanvasKit = await CanvasKitInit({
  locateFile: (f) => path.join(repo, 'node_modules', 'canvaskit-wasm', 'bin', 'full', f),
});

let failed = false;
const liqFx = CanvasKit.RuntimeEffect.Make(liquidSrc, (e) => { failed = true; console.error(e); });
const sphFx = CanvasKit.RuntimeEffect.Make(sphereSrc, (e) => { failed = true; console.error(e); });
if (!liqFx || !sphFx) process.exit(1);

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

function flatUniforms(effect, obj) {
  const out = [];
  for (let i = 0; i < effect.getUniformCount(); i++) {
    const name = effect.getUniformName(i);
    const v = obj[name];
    if (typeof v === 'number') out.push(v);
    else out.push(...v);
  }
  return out;
}

function paintWith(effect, uniforms) {
  const shader = effect.makeShader(flatUniforms(effect, uniforms));
  const paint = new CanvasKit.Paint();
  paint.setAntiAlias(true);
  paint.setShader(shader);
  return { paint, shader };
}

/** Палитра LUCID (нейтральный профиль). */
const PAL = {
  u_deep: hex('#05070F'),
  u_mid: hex('#232055'),
  u_accent: hex('#7EE8FA'),
};
const T = 2.6;

function liquidLayer(size, speed = 0.45, warp = 0.6, energy = 0.3) {
  return {
    effect: liqFx,
    uniforms: {
      u_res: [size, size], u_time: T, ...PAL, u_speed: speed, u_warp: warp, u_energy: energy,
    },
  };
}

function sphereLayer(size, radiusRatio = 0.34, speed = 0.5, warp = 0.65) {
  return {
    effect: sphFx,
    uniforms: {
      u_res: [size, size], u_time: T, ...PAL,
      u_center: [size / 2, size / 2], u_radius: size * radiusRatio,
      u_speed: speed, u_warp: warp,
    },
  };
}

function renderPng(file, size, layers, background = null) {
  const surface = CanvasKit.MakeSurface(size, size);
  const canvas = surface.getCanvas();
  if (background) {
    canvas.clear(background);
  } else {
    canvas.clear(CanvasKit.TRANSPARENT);
  }
  for (const layer of layers) {
    const { paint, shader } = paintWith(layer.effect, layer.uniforms);
    canvas.drawRect(CanvasKit.LTRBRect(0, 0, size, size), paint);
    paint.delete();
    shader.delete();
  }
  const img = surface.makeImageSnapshot();
  const out = path.join(repo, 'assets', file);
  fs.writeFileSync(out, img.encodeToBytes(CanvasKit.ImageFormat.PNG, 100));
  img.delete();
  surface.delete();
  console.log('→', out, `${size}x${size}`);
}

// --- 1. Главный icon.png: жидкий фон + сфера --------------------------------
renderPng('icon.png', 1024, [liquidLayer(1024, 0.4, 0.55, 0.35), sphereLayer(1024, 0.30)]);

// --- 2. Android adaptive: фон (жидкость) и передний план (сфера, безопасная зона)
renderPng('android-icon-background.png', 1024, [liquidLayer(1024, 0.4, 0.55, 0.4)]);
renderPng('android-icon-foreground.png', 1024, [sphereLayer(1024, 0.30)]);

// --- 3. Monochrome (тематическая иконка Android 13+): силуэт сферы ----------
{
  const size = 1024;
  const surface = CanvasKit.MakeSurface(size, size);
  const canvas = surface.getCanvas();
  canvas.clear(CanvasKit.TRANSPARENT);
  const paint = new CanvasKit.Paint();
  paint.setAntiAlias(true);
  const shader = CanvasKit.Shader.MakeRadialGradient(
    [size / 2, size / 2], size * 0.30,
    [CanvasKit.WHITE, CanvasKit.Color(255, 255, 255, 0.0)],
    [0.55, 1.0],
    CanvasKit.TileMode.Clamp,
  );
  paint.setShader(shader);
  canvas.drawCircle(size / 2, size / 2, size * 0.30, paint);
  paint.delete();
  shader.delete();
  const img = surface.makeImageSnapshot();
  const out = path.join(repo, 'assets', 'android-icon-monochrome.png');
  fs.writeFileSync(out, img.encodeToBytes(CanvasKit.ImageFormat.PNG, 100));
  img.delete();
  surface.delete();
  console.log('→', out, `${size}x${size}`);
}

// --- 4. Splash: сфера на прозрачном ------------------------------------------
renderPng('splash-icon.png', 1024, [sphereLayer(1024, 0.26, 0.45, 0.6)]);

// --- 5. Favicon: сфера крупно ------------------------------------------------
renderPng('favicon.png', 96, [sphereLayer(96, 0.34)]);

console.log('Ассеты обновлены.');
