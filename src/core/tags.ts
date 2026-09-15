/**
 * Генеративное ядро LUCID — Часть 1: словарь тегов.
 *
 * Каждый тег — это не просто метка, а набор визуальных параметров:
 *   palette   { deep, mid, accent } — трёхслойная цветовая палитра
 *   speed     — скорость дрейфа жидкости (Кошмар → 2.3, Покой → 0.25)
 *   warp      — турбулентность/плотность шума (Воздух → 1.8, Покой → 0.45)
 *   particles — плотность «звёздной пыли» (Космос → 1.0)
 *
 * Никаких внешних API: сновидение «соткано» локальным шейдером.
 */

export type TagCategory = 'element' | 'emotion' | 'theme';

export interface TagPalette {
  /** Глубокий фон (преобладает) */
  deep: string;
  /** Средний слой жидкости */
  mid: string;
  /** Светящийся акцент — «вены» и ободок сферы */
  accent: string;
}

export interface DreamTag {
  id: string;
  label: string;
  emoji: string;
  category: TagCategory;
  palette: TagPalette;
  /** множитель скорости анимации */
  speed: number;
  /** плотность/турбулентность шума */
  warp: number;
  /** плотность звёздной пыли 0..1 */
  particles: number;
}

export const TAG_CATEGORIES: { id: TagCategory; label: string }[] = [
  { id: 'element', label: 'Стихии' },
  { id: 'emotion', label: 'Эмоции' },
  { id: 'theme', label: 'Темы' },
];

export const TAGS: DreamTag[] = [
  // --- Стихии ---------------------------------------------------------
  {
    id: 'fire', label: 'Огонь', emoji: '🔥', category: 'element',
    palette: { deep: '#1C0502', mid: '#93200A', accent: '#FF6B2B' },
    speed: 1.25, warp: 1.30, particles: 0.55,
  },
  {
    id: 'water', label: 'Вода', emoji: '💧', category: 'element',
    palette: { deep: '#02121F', mid: '#0A4D74', accent: '#35C4F0' },
    speed: 0.60, warp: 0.75, particles: 0.45,
  },
  {
    id: 'air', label: 'Воздух', emoji: '🌬️', category: 'element',
    palette: { deep: '#0A1626', mid: '#33587E', accent: '#B9E8FF' },
    speed: 1.50, warp: 1.80, particles: 0.60,
  },
  {
    id: 'earth', label: 'Земля', emoji: '🪨', category: 'element',
    palette: { deep: '#120D06', mid: '#4E3B18', accent: '#A98A4B' },
    speed: 0.35, warp: 0.50, particles: 0.30,
  },
  // --- Эмоции ---------------------------------------------------------
  {
    id: 'joy', label: 'Радость', emoji: '✨', category: 'emotion',
    palette: { deep: '#241303', mid: '#C98A12', accent: '#FFD86B' },
    speed: 1.10, warp: 0.85, particles: 0.85,
  },
  {
    id: 'fear', label: 'Страх', emoji: '👁️', category: 'emotion',
    palette: { deep: '#0A0812', mid: '#3A2A55', accent: '#8BE84C' },
    speed: 1.45, warp: 1.55, particles: 0.50,
  },
  {
    id: 'calm', label: 'Покой', emoji: '🌙', category: 'emotion',
    palette: { deep: '#03111C', mid: '#0B5566', accent: '#7DE8E0' },
    speed: 0.25, warp: 0.45, particles: 0.40,
  },
  {
    id: 'sadness', label: 'Грусть', emoji: '🌧️', category: 'emotion',
    palette: { deep: '#070C14', mid: '#24344D', accent: '#6E93C4' },
    speed: 0.45, warp: 0.55, particles: 0.35,
  },
  {
    id: 'euphoria', label: 'Эйфория', emoji: '🌈', category: 'emotion',
    palette: { deep: '#1A0524', mid: '#7A1FA8', accent: '#FF5CF4' },
    speed: 1.60, warp: 1.05, particles: 0.90,
  },
  {
    id: 'nightmare', label: 'Кошмар', emoji: '💀', category: 'emotion',
    palette: { deep: '#0F0108', mid: '#55071E', accent: '#E0203A' },
    speed: 2.30, warp: 2.00, particles: 0.45,
  },
  // --- Темы -----------------------------------------------------------
  {
    id: 'space', label: 'Космос', emoji: '🌌', category: 'theme',
    palette: { deep: '#050718', mid: '#241A5E', accent: '#9D7BFF' },
    speed: 0.30, warp: 0.50, particles: 1.00,
  },
  {
    id: 'forest', label: 'Лес', emoji: '🌲', category: 'theme',
    palette: { deep: '#04120A', mid: '#1D5C33', accent: '#5FD98A' },
    speed: 0.40, warp: 0.65, particles: 0.50,
  },
  {
    id: 'city', label: 'Город', emoji: '🏙️', category: 'theme',
    palette: { deep: '#080A12', mid: '#2C3A55', accent: '#4EE3F5' },
    speed: 0.90, warp: 1.00, particles: 0.70,
  },
  {
    id: 'ocean', label: 'Океан', emoji: '🌊', category: 'theme',
    palette: { deep: '#020D1A', mid: '#0B3D5C', accent: '#2FD4C8' },
    speed: 0.55, warp: 0.80, particles: 0.45,
  },
  {
    id: 'storm', label: 'Шторм', emoji: '⛈️', category: 'theme',
    palette: { deep: '#0A0E16', mid: '#2E4260', accent: '#BFD9FF' },
    speed: 1.85, warp: 1.75, particles: 0.55,
  },
  {
    id: 'dawn', label: 'Рассвет', emoji: '🌅', category: 'theme',
    palette: { deep: '#1B0A14', mid: '#A63A5C', accent: '#FFB36B' },
    speed: 0.50, warp: 0.55, particles: 0.50,
  },
  {
    id: 'mountains', label: 'Горы', emoji: '🏔️', category: 'theme',
    palette: { deep: '#060B16', mid: '#2A3F5E', accent: '#A8C8E8' },
    speed: 0.35, warp: 0.45, particles: 0.40,
  },
  {
    id: 'dusk', label: 'Сумерки', emoji: '🌆', category: 'theme',
    palette: { deep: '#0C0618', mid: '#3E2158', accent: '#C77BD9' },
    speed: 0.45, warp: 0.55, particles: 0.45,
  },
];

export const TAG_BY_ID: Record<string, DreamTag> = Object.fromEntries(
  TAGS.map((t) => [t.id, t]),
);

export function tagsByIds(ids: string[]): DreamTag[] {
  return ids.map((id) => TAG_BY_ID[id]).filter(Boolean);
}
