/**
 * Генеративное ядро LUCID — Часть 2: смешивание «Теги → Параметры».
 *
 * Выбранные теги сливаются в единый визуальный профиль сна:
 *   • палитры усредняются (акцент — с повышенным весом), затем слегка
 *     поворачиваются по hue уникальным для записи сидом → каждый сон
 *     визуально неповторим даже с одинаковыми тегами;
 *   • скорость и турбулентность растут с числом тегов (сон «плотнее»);
 *   • звёздная пыль берётся по максимуму тегов.
 *
 * Всё вычисляется локально, детерминированно и без сети.
 */
import { DreamTag, tagsByIds } from './tags';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface DreamParams {
  deep: RGB;
  mid: RGB;
  accent: RGB;
  speed: number;
  warp: number;
  particles: number;
}

// --- цветовая математика ----------------------------------------------------

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * 255)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function rgbToHsl({ r, g, b }: RGB): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hue2rgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): RGB {
  if (s === 0) return { r: l, g: l, b: l };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3),
    g: hue2rgb(p, q, h),
    b: hue2rgb(p, q, h - 1 / 3),
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) };
}

/** Поворот оттенка (в долях полного круга) с сохранением S/L. */
function rotateHue(c: RGB, d: number): RGB {
  const [h, s, l] = rgbToHsl(c);
  return hslToRgb((h + d + 1) % 1, s, l);
}

// --- профиль сна --------------------------------------------------------------

/** Нейтральный профиль — «предрассветное» состояние без тегов. */
export const NEUTRAL_PARAMS: DreamParams = {
  deep: hexToRgb('#05070F'),
  mid: hexToRgb('#232055'),
  accent: hexToRgb('#7EE8FA'),
  speed: 0.45,
  warp: 0.6,
  particles: 0.35,
};

/** Детерминированный сид из строки (id записи). */
export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Смешать теги в единый профиль. `seed` (0..1) делает запись уникальной:
 * лёгкий сдвиг оттенка и джиттер параметров.
 */
export function blendDreamParams(tags: DreamTag[], seed = 0.5): DreamParams {
  if (tags.length === 0) {
    // даже пустой сон слегка уникален
    return {
      ...NEUTRAL_PARAMS,
      warp: NEUTRAL_PARAMS.warp * (0.9 + 0.3 * seed),
    };
  }

  let deep = { r: 0, g: 0, b: 0 };
  let mid = { r: 0, g: 0, b: 0 };
  let accent = { r: 0, g: 0, b: 0 };
  let wDeep = 0;
  let wMid = 0;
  let wAccent = 0;

  for (const t of tags) {
    const d = hexToRgb(t.palette.deep);
    const m = hexToRgb(t.palette.mid);
    const a = hexToRgb(t.palette.accent);
    // акцент важнее всего — он задаёт «неон» сна
    const wd = 1;
    const wm = 1.1;
    const wa = 1.35;
    deep = mixRgb(deep, d, wd / (wDeep + wd));
    mid = mixRgb(mid, m, wm / (wMid + wm));
    accent = mixRgb(accent, a, wa / (wAccent + wa));
    wDeep += wd;
    wMid += wm;
    wAccent += wa;
  }

  const n = tags.length;
  const baseSpeed = tags.reduce((s, t) => s + t.speed, 0) / n;
  const baseWarp = tags.reduce((s, t) => s + t.warp, 0) / n;
  const baseParticles = Math.max(...tags.map((t) => t.particles));

  // чем больше тегов — тем «плотнее» и живее сон
  const speed = clamp(baseSpeed * (1 + 0.06 * (n - 1)) * (0.92 + 0.16 * seed), 0.15, 2.6);
  const warp = clamp(baseWarp * (1 + 0.05 * (n - 1)) * (0.9 + 0.25 * seed), 0.4, 2.4);
  const particles = clamp(baseParticles + 0.08 * (n - 1), 0, 1);

  // уникальный лёгкий сдвиг оттенка (±6% круга)
  const hueShift = (seed - 0.5) * 0.12;

  return {
    deep: rotateHue(deep, hueShift * 0.6),
    mid: rotateHue(mid, hueShift),
    accent: rotateHue(accent, hueShift * 1.2),
    speed,
    warp,
    particles,
  };
}

export function dreamParamsForIds(tagIds: string[], seed = 0.5): DreamParams {
  return blendDreamParams(tagsByIds(tagIds), seed);
}

// --- модель записи и утилиты ---------------------------------------------------

export interface DreamEntry {
  id: string;
  title: string;
  createdAt: number;
  tags: string[];
  /** подробное описание сна (опционально, для старых записей отсутствует) */
  note?: string;
}

export function createDreamEntry(title: string, tagIds: string[], note?: string): DreamEntry {
  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    title: title.trim() || 'Безымянный сон',
    createdAt: Date.now(),
    tags: [...tagIds],
    note: note?.trim() ? note.trim() : undefined,
  };
}

/** Обновлённая запись с сохранением id/даты создания. */
export function updateDreamEntry(
  previous: DreamEntry,
  title: string,
  tagIds: string[],
  note?: string,
): DreamEntry {
  return {
    ...previous,
    title: title.trim() || 'Безымянный сон',
    tags: [...tagIds],
    note: note?.trim() ? note.trim() : undefined,
  };
}

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export function formatDreamDate(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

export function formatDreamDateShort(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const base = `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
  return sameYear ? `${base}, ${hh}:${mm}` : `${base} ${d.getFullYear()}, ${hh}:${mm}`;
}

/** Параметры «дыхания музея» — смесь всех сохранённых снов. */
export function museumAmbient(entries: DreamEntry[]): DreamParams {
  if (entries.length === 0) return NEUTRAL_PARAMS;
  return blendDreamParams(
    entries.flatMap((e) => tagsByIds(e.tags)),
    hashSeed(entries.map((e) => e.id).join('|')),
  );
}

// --- статистика музея ----------------------------------------------------------

export interface DreamStats {
  total: number;
  /** записей за последние 7 дней */
  week: number;
  /** самый частый тег (null, если тегов нет) */
  topTagId: string | null;
  /** дней подряд с хотя бы одним сном (считая сегодня/вчера) */
  streak: number;
}

function dayKey(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
}

export function computeDreamStats(entries: DreamEntry[]): DreamStats {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 3600 * 1000;
  const week = entries.filter((e) => e.createdAt > weekAgo).length;

  const counts = new Map<string, number>();
  for (const e of entries) {
    for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  let topTagId: string | null = null;
  let topCount = 0;
  for (const [id, c] of counts) {
    if (c > topCount) {
      topTagId = id;
      topCount = c;
    }
  }

  // серия дней: уникальные дни записей, идём назад от сегодня (или вчера)
  const days = new Set(entries.map((e) => dayKey(e.createdAt)));
  const today = dayKey(now);
  const yesterday = today - 1;
  let streak = 0;
  let cursor = days.has(today) ? today : days.has(yesterday) ? yesterday : -1;
  while (cursor >= 0 && days.has(cursor)) {
    streak++;
    cursor--;
  }

  return { total: entries.length, week, topTagId, streak };
}
