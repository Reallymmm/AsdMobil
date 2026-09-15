/**
 * ЭКРАН 3 — «Музей снов»: галерея сохранённых снов.
 *
 * Фон «дышит» смесью всех сохранённых снов (museumAmbient).
 * Вертикальная лента карточек: матовое стекло поверх уникального
 * градиента каждого сна. Тап — пережить сон снова в визуализаторе.
 */
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiquidBackground } from '../components/LiquidBackground';
import { DreamCard } from '../components/DreamCard';
import { GlassButton } from '../components/GlassButton';
import { GlassContainer } from '../components/GlassContainer';
import { colors, fonts, type } from '../theme';
import { museumAmbient, type DreamEntry } from '../core/dreamEngine';

export interface GalleryScreenProps {
  dreams: DreamEntry[];
  onOpenDream: (dream: DreamEntry) => void;
  onDeleteDream: (dream: DreamEntry) => void;
  onBack: () => void;
  onNewDream: () => void;
}

export function GalleryScreen({
  dreams,
  onOpenDream,
  onDeleteDream,
  onBack,
  onNewDream,
}: GalleryScreenProps) {
  const ambient = useMemo(() => museumAmbient(dreams), [dreams]);

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
            data={dreams}
            keyExtractor={(d) => d.id}
            renderItem={({ item }) => (
              <DreamCard dream={item} onOpen={onOpenDream} onDelete={onDeleteDream} />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
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
