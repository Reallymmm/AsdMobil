/**
 * ЭКРАН 3 — «Музей снов»: галерея сохранённых снов.
 *
 * Фон «дышит» смесью всех сохранённых снов (museumAmbient).
 * Сверху — панель статистики, поиск по названиям и заметкам,
 * фильтры-чипы по тегам и переключатель сортировки.
 * Вертикальная лента карточек: матовое стекло поверх уникального
 * градиента каждого сна. Тап — пережить сон снова в визуализаторе,
 * ✎ — редактировать, ✕ — удалить.
 */
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiquidBackground } from '../components/LiquidBackground';
import { DreamCard } from '../components/DreamCard';
import { GlassButton } from '../components/GlassButton';
import { GlassContainer } from '../components/GlassContainer';
import { colors, fonts, radius, type } from '../theme';
import {
  computeDreamStats,
  museumAmbient,
  type DreamEntry,
} from '../core/dreamEngine';
import { TAG_BY_ID } from '../core/tags';
import { haptic } from '../core/haptics';

export interface GalleryScreenProps {
  dreams: DreamEntry[];
  onOpenDream: (dream: DreamEntry) => void;
  onEditDream: (dream: DreamEntry) => void;
  onDeleteDream: (dream: DreamEntry) => void;
  onBack: () => void;
  onNewDream: () => void;
}

export function GalleryScreen({
  dreams,
  onOpenDream,
  onEditDream,
  onDeleteDream,
  onBack,
  onNewDream,
}: GalleryScreenProps) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  const ambient = useMemo(() => museumAmbient(dreams), [dreams]);
  const stats = useMemo(() => computeDreamStats(dreams), [dreams]);

  // теги, встречающиеся в сохранённых снах (топ по частоте)
  const usedTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of dreams) {
      for (const t of d.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => TAG_BY_ID[id])
      .filter(Boolean);
  }, [dreams]);

  const visible = useMemo(() => {
    let list = dreams;
    if (activeTag) list = list.filter((d) => d.tags.includes(activeTag));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.note ?? '').toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) =>
      sortAsc ? a.createdAt - b.createdAt : b.createdAt - a.createdAt,
    );
  }, [dreams, activeTag, query, sortAsc]);

  const filtering = query.trim().length > 0 || activeTag !== null;

  return (
    <View style={styles.root}>
      <LiquidBackground params={ambient} energy={0.3} />

      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <GlassButton label="‹ Призма" onPress={onBack} hapticKind="light" />
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Музей снов</Text>
            <Text style={styles.count}>
              {dreams.length === 0
                ? 'пока пусто'
                : `${dreams.length} ${pluralDreams(dreams.length)}`}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {dreams.length === 0 ? (
          <EmptyState onNewDream={onNewDream} />
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(d) => d.id}
            renderItem={({ item }) => (
              <DreamCard
                dream={item}
                onOpen={onOpenDream}
                onEdit={onEditDream}
                onDelete={onDeleteDream}
              />
            )}
            ListHeaderComponent={
              <View style={styles.tools}>
                <StatsBar stats={stats} />
                <GlassContainer intensity={1.1} rounded={radius.pill} style={styles.searchWrap}>
                  <Text style={styles.searchIcon}>⌕</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Поиск по снам…"
                    placeholderTextColor={colors.textFaint}
                    value={query}
                    onChangeText={setQuery}
                    returnKeyType="search"
                    accessibilityLabel="Поиск по снам"
                  />
                  {query.length > 0 ? (
                    <Pressable
                      onPress={() => setQuery('')}
                      hitSlop={10}
                      accessibilityLabel="Очистить поиск"
                    >
                      <Text style={styles.clearIcon}>✕</Text>
                    </Pressable>
                  ) : null}
                </GlassContainer>
                <View style={styles.filtersRow}>
                  <ScrollView style={styles.flex}>
                    <View style={styles.chipsRow}>
                      <FilterChip
                        label="Все"
                        emoji="✦"
                        active={activeTag === null}
                        onPress={() => setActiveTag(null)}
                      />
                      {usedTags.map((t) => (
                        <FilterChip
                          key={t.id}
                          label={t.label}
                          emoji={t.emoji}
                          active={activeTag === t.id}
                          onPress={() => {
                            haptic.light();
                            setActiveTag(activeTag === t.id ? null : t.id);
                          }}
                        />
                      ))}
                    </View>
                  </ScrollView>
                  <Pressable
                    onPress={() => {
                      haptic.light();
                      setSortAsc((v) => !v);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Переключить сортировку"
                    hitSlop={6}
                  >
                    <GlassContainer
                      intensity={1}
                      rounded={radius.pill}
                      style={styles.sortChip}
                    >
                      <Text style={styles.sortText}>{sortAsc ? '↑ старые' : '↓ новые'}</Text>
                    </GlassContainer>
                  </Pressable>
                </View>
                {filtering ? (
                  <Text style={styles.filterNote}>
                    {visible.length === 0
                      ? 'Ничего не найдено'
                      : `Найдено: ${visible.length} ${pluralDreams(visible.length)}`}
                  </Text>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              filtering ? (
                <View style={styles.emptySearch}>
                  <Text style={styles.emptySearchGlyph}>☁︎</Text>
                  <Text style={styles.emptySearchText}>
                    По такому запросу снов нет. Попробуйте другое слово или снимите фильтр.
                  </Text>
                </View>
              ) : null
            }
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </SafeAreaView>
    </View>
  );
}

/** Панель статистики музея. */
function StatsBar({ stats }: { stats: ReturnType<typeof computeDreamStats> }) {
  const topTag = stats.topTagId ? TAG_BY_ID[stats.topTagId] : null;
  const parts: string[] = [];
  parts.push(`✦ ${stats.total} ${pluralDreams(stats.total)}`);
  if (stats.week > 0) parts.push(`${stats.week} за неделю`);
  if (stats.streak >= 2) parts.push(`серия ${stats.streak} дн.`);
  return (
    <GlassContainer intensity={1.25} style={styles.statsCard}>
      <Text style={styles.statsMain}>{parts.join('  ·  ')}</Text>
      {topTag ? (
        <Text style={styles.statsSub}>
          частый гость: {topTag.emoji} {topTag.label}
        </Text>
      ) : (
        <Text style={styles.statsSub}>добавьте теги — статистика оживёт</Text>
      )}
    </GlassContainer>
  );
}

function FilterChip({
  label,
  emoji,
  active,
  onPress,
}: {
  label: string;
  emoji: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <GlassContainer
        intensity={active ? 0.4 : 0.85}
        rounded={radius.pill}
        style={
          active
            ? [
                styles.filterChip,
                { backgroundColor: 'rgba(126,232,250,0.16)', borderColor: 'rgba(126,232,250,0.55)' },
              ]
            : styles.filterChip
        }
      >
        <Text style={styles.filterChipText}>
          {emoji} {label}
        </Text>
      </GlassContainer>
    </Pressable>
  );
}

function EmptyState({ onNewDream }: { onNewDream: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <GlassContainer intensity={1.3} style={styles.emptyCard}>
        <Text style={styles.emptyGlyph}>☾</Text>
        <Text style={styles.emptyTitle}>Здесь пока тишина</Text>
        <Text style={styles.emptyText}>
          Ваш первый сон ещё не соткан. Вернитесь к призме, дайте сну имя,
          выберите теги — и музей оживёт.
        </Text>
        <GlassButton label="✦ Соткать первый сон" onPress={onNewDream} />
      </GlassContainer>
    </View>
  );
}

function pluralDreams(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'сон';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'сна';
  return 'снов';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: { width: 86 },
  title: {
    ...type.title,
    fontSize: 20,
  },
  count: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textDim,
    marginTop: 3,
    letterSpacing: 0.4,
  },
  tools: {
    gap: 10,
    paddingBottom: 6,
  },
  statsCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  statsMain: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
    letterSpacing: 0.3,
  },
  statsSub: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textDim,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  searchIcon: {
    fontSize: 15,
    color: colors.textDim,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 9,
  },
  clearIcon: {
    fontSize: 12,
    color: colors.textDim,
    padding: 4,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textDim,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textDim,
  },
  filterNote: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textFaint,
    paddingLeft: 4,
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptySearchGlyph: {
    fontSize: 38,
    color: colors.textFaint,
  },
  emptySearchText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textDim,
    textAlign: 'center',
    maxWidth: 280,
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 28,
    gap: 16,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  emptyCard: {
    padding: 26,
    alignItems: 'center',
    gap: 12,
    maxWidth: 380,
  },
  emptyGlyph: {
    fontSize: 40,
    color: colors.textDim,
    marginBottom: 2,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text,
    letterSpacing: 0.5,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textDim,
    textAlign: 'center',
    marginBottom: 6,
  },
});
