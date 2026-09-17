/**
 * «Открытка сна» — экспорт генеративного искусства сна в PNG.
 *
 * Кадр 1080×1350 рендерится в офскрин-Surface тем же шейдером
 * визуализатора (палитра/скорость/звёзды — из тегов сна, время —
 * детерминированный сид записи), сверху — типографика: вордмарк,
 * название, дата и теги. Дальше — шаринг (натив) или скачивание (веб).
 */
import { Platform } from 'react-native';
import { ImageFormat, PaintStyle, Skia, TileMode, type SkFont } from '@shopify/react-native-skia';
import { visualizerFx } from './shaders/effects';
import {
  dreamParamsForIds,
  formatDreamDate,
  hashSeed,
  type DreamEntry,
} from './dreamEngine';
import { TAG_BY_ID } from './tags';

const W = 1080;
const H = 1350;
const M = 76; // поле

export interface PostcardFonts {
  title: SkFont | null;
  body: SkFont | null;
}

// --- base64 -------------------------------------------------------------------

function toBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    out += chars[b0 >> 2];
    out += chars[((b0 & 3) << 4) | (b1 >> 4)];
    out += chars[((b1 & 15) << 2) | (b2 >> 6)];
    out += chars[b2 & 63];
  }
  const pad = len % 3;
  return pad === 0 ? out : out.slice(0, out.length - (3 - pad)) + '='.repeat(3 - pad);
}

// --- перенос строк --------------------------------------------------------------

/** Ширина строки: getTextWidth работает и на нативе, и на RN Web
 *  (measureText на вебе не реализован в @shopify/react-native-skia). */
function textWidth(font: SkFont, s: string): number {
  return font.getTextWidth(s);
}

function wrapText(text: string, font: SkFont, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  const width = (s: string) => textWidth(font, s);
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (width(candidate) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    let last = lines[maxLines - 1];
    while (width(`${last}…`) > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

// --- рендер открытки -------------------------------------------------------------

export function renderDreamPostcard(dream: DreamEntry, fonts: PostcardFonts): string | null {
  const surface = Skia.Surface.Make(W, H);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('#05070F'));

  const params = dreamParamsForIds(dream.tags, hashSeed(dream.id));
  const seedT = 3 + hashSeed(`${dream.id}#t`) * 40;

  // 1) фон — шейдер сна
  if (visualizerFx) {
    const dead = [-9999, -9999, 0, 0];
    const uniforms = [
      W, H, seedT,
      params.deep.r, params.deep.g, params.deep.b,
      params.mid.r, params.mid.g, params.mid.b,
      params.accent.r, params.accent.g, params.accent.b,
      params.speed, params.warp, params.particles,
      ...dead, ...dead, ...dead, ...dead,
    ];
    const shader = visualizerFx.makeShader(uniforms);
    if (shader) {
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setShader(shader);
      canvas.drawRect(Skia.XYWHRect(0, 0, W, H), paint);
    }
  }

  // 2) затемнение снизу для читаемости текста
  const grad = Skia.Shader.MakeLinearGradient(
    { x: 0, y: H * 0.52 },
    { x: 0, y: H },
    [Skia.Color('rgba(4,6,14,0)'), Skia.Color('rgba(3,5,12,0.94)')],
    [0, 1],
    TileMode.Clamp,
  );
  if (grad) {
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setShader(grad);
    canvas.drawRect(Skia.XYWHRect(0, H * 0.52, W, H * 0.48), paint);
  }

  // 3) тонкая рамка «стекла»
  const frame = Skia.Paint();
  frame.setAntiAlias(true);
  frame.setStyle(PaintStyle.Stroke);
  frame.setStrokeWidth(2);
  frame.setColor(Skia.Color('rgba(255,255,255,0.22)'));
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(26, 26, W - 52, H - 52), 44, 44), frame);

  const textPaint = Skia.Paint();
  textPaint.setAntiAlias(true);

  // 4) вордмарк
  if (fonts.title) {
    const wm = fonts.title;
    wm.setSize(30);
    textPaint.setColor(Skia.Color('rgba(234,242,255,0.85)'));
    canvas.drawText('L U C I D', M, 120, textPaint, wm);
  }

  // 5) текстовый блок снизу
  if (fonts.title && fonts.body) {
    const titleFont = fonts.title;
    const bodyFont = fonts.body;

    // теги: точки с цветом тега + подписи, с раскладкой по строкам
    const tagObjs = dream.tags
      .map((id) => TAG_BY_ID[id])
      .filter(Boolean)
      .slice(0, 6);
    bodyFont.setSize(30);
    const rows: { label: string; color: string }[][] = [];
    let row: { label: string; color: string }[] = [];
    let rowW = 0;
    for (const t of tagObjs) {
      const itemW = 26 + textWidth(bodyFont, t.label) + 36;
      if (rowW + itemW > W - 2 * M && row.length > 0) {
        rows.push(row);
        row = [];
        rowW = 0;
      }
      row.push({ label: t.label, color: t.palette.accent });
      rowW += itemW;
    }
    if (row.length > 0) rows.push(row);

    // раскладка снизу вверх
    const dateFont = bodyFont;
    dateFont.setSize(31);
    const dateY = H - M - 30;
    textPaint.setColor(Skia.Color('rgba(234,242,255,0.62)'));
    canvas.drawText(formatDreamDate(dream.createdAt), M, dateY, textPaint, dateFont);

    let tagsBaseY = dateY - 58; // базовая линия последнего ряда тегов
    for (let r = rows.length - 1; r >= 0; r--) {
      let x = M;
      for (const item of rows[r]) {
        const dot = Skia.Paint();
        dot.setAntiAlias(true);
        dot.setColor(Skia.Color(item.color));
        canvas.drawCircle(x + 9, tagsBaseY - 10, 9, dot);
        textPaint.setColor(Skia.Color('rgba(234,242,255,0.78)'));
        canvas.drawText(item.label, x + 26, tagsBaseY, textPaint, dateFont);
        x += 26 + textWidth(dateFont, item.label) + 36;
      }
      tagsBaseY -= 52;
    }

    // название (до 3 строк)
    titleFont.setSize(58);
    const lines = wrapText(dream.title, titleFont, W - 2 * M, 3);
    const lineH = 76;
    let titleBase = tagsBaseY - 34 - (lines.length - 1) * lineH;
    if (titleBase < 200) titleBase = 200 + (lines.length - 1) * lineH;
    textPaint.setColor(Skia.Color('#EAF2FF'));
    lines.forEach((ln, i) => {
      canvas.drawText(ln, M, titleBase + i * lineH, textPaint, titleFont);
    });

    // водяной знак справа снизу
    bodyFont.setSize(26);
    textPaint.setColor(Skia.Color('rgba(234,242,255,0.4)'));
    const mark = '✦ дневник снов';
    const markW = textWidth(bodyFont, mark);
    canvas.drawText(mark, W - M - markW, 120, textPaint, bodyFont);
  }

  // 6) снимок → PNG → base64
  const image = surface.makeImageSnapshot();
  if (!image) return null;
  const bytes = image.encodeToBytes(ImageFormat.PNG, 100);
  image.dispose?.();
  surface.dispose?.();
  return toBase64(bytes);
}

// --- шаринг -----------------------------------------------------------------------

export async function shareDreamPostcard(
  dream: DreamEntry,
  fonts: PostcardFonts,
): Promise<boolean> {
  const base64 = renderDreamPostcard(dream, fonts);
  if (!base64) return false;

  if (Platform.OS === 'web') {
    try {
      const a = document.createElement('a');
      a.href = `data:image/png;base64,${base64}`;
      a.download = `lucid-${dream.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    } catch {
      return false;
    }
  }

  try {
    const FileSystem = await import('expo-file-system/legacy');
    const Sharing = await import('expo-sharing');
    const dir = FileSystem.cacheDirectory;
    if (!dir) return false;
    const path = `${dir}lucid-${dream.id}.png`;
    await FileSystem.writeAsStringAsync(path, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Sharing.shareAsync(path, {
      mimeType: 'image/png',
      dialogTitle: 'Открытка сна',
    });
    return true;
  } catch {
    return false;
  }
}
