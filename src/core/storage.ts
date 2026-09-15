/**
 * Локальное хранение снов (Шаг 5 ТЗ).
 * AsyncStorage — key-value хранилище (на iOS это NSUserDefaults/диск,
 * на Android — SQLite внутри нативного модуля, на вебе — localStorage).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DreamEntry } from './dreamEngine';

const KEY = 'lucid.dreams.v1';

export async function loadDreams(): Promise<DreamEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is DreamEntry =>
        e && typeof e.id === 'string' && typeof e.title === 'string' && Array.isArray(e.tags),
    );
  } catch {
    return [];
  }
}

export async function saveDreams(dreams: DreamEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(dreams));
  } catch {
    // тихо игнорируем сбои записи — приложение остаётся usable
  }
}

export async function wipeDreams(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
