/**
 * ЭКРАН 2 — «Жидкий сон»: визуализатор.
 *
 * Весь экран — интерактивный шейдер (VisualizerCanvas), касания
 * рождают волны и вихри. Поверх — оверлей «запотевшего стекла»:
 * карточка с названием и датой сна (в углу), навигация снизу.
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOut,
} from 'react-native-reanimated';
import { VisualizerCanvas } from '../components/VisualizerCanvas';
import { GlassButton } from '../components/GlassButton';
import { GlassContainer } from '../components/GlassContainer';
import { colors, fonts, type } from '../theme';
import {
  dreamParamsForIds,
  formatDreamDate,
  hashSeed,
  rgbToHex,
  type DreamEntry,
} from '../core/dreamEngine';
import { TAG_BY_ID } from '../core/tags';

export interface VisualizerScreenProps {
  dream: DreamEntry;
  onBack: () => void;
  onOpenGallery: () => void;
  onNewDream: () => void;
}

export function VisualizerScreen({
  dream,
  onBack,
  onOpenGallery,
  onNewDream,
}: VisualizerScreenProps) {
  const [touched, setTouched] = useState(false);

  const params = useMemo(
    () => dreamParamsForIds(dream.tags, hashSeed(dream.id)),
    [dream.tags, dream.id],
  );
  const accentHex = useMemo(() => rgbToHex(params.accent), [params.accent]);

  const tagChips = dream.tags
    .map((id) => TAG_BY_ID[id])
    .filter(Boolean)
    .slice(0, 6);

  return (
    <View style={styles.root}>
      <VisualizerCanvas params={params} onTouch={() => setTouched(true)} />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* верхний левый угол: назад + карточка сна */}
        <View style={styles.topCluster} pointerEvents="box-none">
          <Animated.View entering={FadeInDown.springify().damping(18)} exiting={FadeOut.duration(200)}>
            <GlassButton label="‹ Призма" onPress={onBack} hapticKind="light" />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.springify().damping(18).delay(90)}
            exiting={FadeOut.duration(200)}
          >
            <GlassContainer
              intensity={1.35}
              glowColor={accentHex}
              glowStrength={0.4}
              style={styles.dreamCard}
            >
              <Text style={styles.dreamTitle} numberOfLines={2}>
                {dream.title}
              </Text>
              <Text style={styles.dreamDate}>{formatDreamDate(dream.createdAt)}</Text>
              {tagChips.length > 0 ? (
                <View style={styles.chipRow}>
                  {tagChips.map((t) => (
                    <Text key={t.id} style={styles.chipEmoji}>
                      {t.emoji}
                    </Text>
                  ))}
                </View>
              ) : null}
            </GlassContainer>
          </Animated.View>
        </View>

        {/* подсказка до первого касания */}
        {!touched ? (
          <Animated.View
            entering={FadeInUp.springify().damping(16).delay(500)}
            exiting={FadeOut.duration(400)}
            pointerEvents="none"
            style={styles.hintWrap}
          >
            <Text style={styles.hint}>проведите пальцем по жидкости…</Text>
          </Animated.View>
        ) : null}

        {/* нижняя навигация */}
        <Animated.View
          entering={FadeInUp.springify().damping(18).delay(60)}
          style={styles.bottomRow}
          pointerEvents="box-none"
        >
          <GlassButton label="Музей снов" icon="◈" onPress={onOpenGallery} hapticKind="light" />
          <GlassButton label="Новый сон" icon="✦" onPress={onNewDream} hapticKind="light" />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topCluster: {
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 10,
    alignSelf: 'flex-start',
  },
  dreamCard: {
    padding: 16,
    maxWidth: 320,
    gap: 5,
  },
  dreamTitle: {
    ...type.title,
    fontSize: 19,
    lineHeight: 25,
  },
  dreamDate: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textDim,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 6,
  },
  chipEmoji: {
    fontSize: 15,
  },
  hintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 108,
    alignItems: 'center',
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDim,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
