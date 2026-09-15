/**
 * Тактильность (Шаг 4 ТЗ): виброотклик на нажатия стеклянных элементов.
 * На вебе haptics недоступны — вызовы просто игнорируются.
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptic = {
  /** лёгкий тик — выбор тега, касание жидкости */
  light: () => {
    if (!enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** средний удар — нажатие главных кнопок */
  medium: () => {
    if (!enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  /** мягкий/тяжёлый — «соткать сон» */
  heavy: () => {
    if (!enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  /** успех — сон соткан и сохранён */
  success: () => {
    if (!enabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  /** предупреждение — удаление сна из музея */
  warning: () => {
    if (!enabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
};

export type HapticKind = keyof typeof haptic;
