/**
 * Карточка сна в «Музее снов».
 *
 * Сквозь матовое стекло просвечивает уникальный градиент данного сна
 * (LinearGradient по палитре, направление — из сида записи). Карточка
 * «дышит» при нажатии пружиной; удаление — с предупреждением-хаптикой.
 */
import React, { useMemo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, radius, springs } from '../theme';
import {
  dreamParamsForIds,
  formatDreamDateShort,
  hashSeed,
  hexToRgb,
  type DreamEntry,
} from '../core/dreamEngine';
import { TAG_BY_ID } from '../core/tags';
import { haptic } from '../core/haptics';

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}

export interface DreamCardProps {
  dream: DreamEntry;
  onOpen: (dream: DreamEntry) => void;
  onDelete: (dream: DreamEntry) => void;
  onEdit: (dream: DreamEntry) => void;
}

export function DreamCard({ dream, onOpen, onDelete, onEdit }: DreamCardProps) {
  const scale = useSharedValue(1);
  const dying = useSharedValue(0);

  const params = useMemo(
    () => dreamParamsForIds(dream.tags, hashSeed(dream.id)),
    [dream.tags, dream.id],
  );

  // уникальный наклон градиента из сида записи
  const [start, end] = useMemo(() => {
    const a = hashSeed(`${dream.id}#angle`) * Math.PI * 2;
    const c = Math.cos(a) / 2;
    const s = Math.sin(a) / 2;
    return [
      { x: 0.5 - c, y: 0.5 - s },
      { x: 0.5 + c, y: 0.5 + s },
    ];
  }, [dream.id]);

  const accentHex = useMemo(() => {
    const { r, g, b } = params.accent;
    const c = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${c(r)}${c(g)}${c(b)}`;
  }, [params.accent]);

  const gradient = useMemo(() => {
    const toHex = (c: { r: number; g: number; b: number }) => {
      const f = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
      return `#${f(c.r)}${f(c.g)}${f(c.b)}`;
    };
    return [toHex(params.deep), toHex(params.mid), rgba(toHex(params.accent), 0.92)] as [
      string,
      string,
      string,
    ];
  }, [params]);

  const cardBorderColor = useMemo(() => rgba(accentHex, 0.30), [accentHex]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 1 - dying.value,
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.972, springs.snappy);
  }, [scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, springs.gentle);
  }, [scale]);

  const handleOpen = useCallback(() => {
    haptic.light();
    onOpen(dream);
  }, [dream, onOpen]);

  const handleEdit = useCallback(() => {
    haptic.light();
    onEdit(dream);
  }, [dream, onEdit]);

  const handleDelete = useCallback(() => {
    haptic.warning();
    dying.value = withTiming(1, { duration: 260 }, (fin) => {
      if (fin) onDelete(dream);
    });
    scale.value = withSequence(withSpring(0.97, springs.snappy), withSpring(0.9, springs.gentle));
  }, [dream, dying, onDelete, scale]);

  const tagChips = dream.tags
    .map((id) => TAG_BY_ID[id])
    .filter(Boolean)
    .slice(0, 5);

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={`Сон: ${dream.title}`}
      >
        <View style={[styles.card, { borderColor: cardBorderColor }]}>
          {/* уникальный градиент сна */}
          <LinearGradient
            colors={gradient}
            start={start}
            end={end}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          {/* затемнение для читаемости + «матовость» */}
          <View style={styles.frost} />
          <View style={styles.content}>
            <View style={styles.topRow}>
              <View style={{ flex: 1, paddingRight: 78 }}>
                <Text style={styles.title} numberOfLines={2}>
                  {dream.title}
                </Text>
                <Text style={styles.date}>{formatDreamDateShort(dream.createdAt)}</Text>
                {dream.note ? (
                  <Text style={styles.note} numberOfLines={2}>
                    {dream.note}
                  </Text>
                ) : null}
              </View>
              <View style={styles.actions}>
                <Pressable
                  onPress={handleEdit}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Редактировать сон"
                  style={styles.delete}
                >
                  <Text style={styles.deleteText}>✎</Text>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Удалить сон"
                  style={styles.delete}
                >
                  <Text style={styles.deleteText}>✕</Text>
                </Pressable>
              </View>
            </View>
            {tagChips.length > 0 ? (
              <View style={styles.chips}>
                {tagChips.map((t) => (
                  <View
                    key={t.id}
                    style={[styles.chip, { borderColor: rgba(t.palette.accent, 0.5) }]}
                  >
                    <Text style={styles.chipText}>
                      {t.emoji} {t.label}
                    </Text>
                  </View>
                ))}
                {dream.tags.length > 5 ? (
                  <View style={[styles.chip, styles.chipMore]}>
                    <Text style={styles.chipText}>+{dream.tags.length - 5}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={styles.noTags}>без тегов — чистый поток сознания</Text>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.l,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: colors.glassBorder,
  },
  frost: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(4, 6, 14, 0.52)',
  },
  content: {
    padding: 18,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 17,
    lineHeight: 23,
    color: colors.text,
    letterSpacing: 0.3,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textDim,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  delete: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17.5,
    color: colors.textDim,
    marginTop: 7,
  },
  deleteText: {
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 15,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textDim,
  },
  chipMore: {
    borderColor: 'rgba(255,255,255,0.16)',
  },
  noTags: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textFaint,
    fontStyle: 'italic',
  },
});
