/**
 * ЭКРАН 1 — «Призма»: запись сна.
 *
 * Сверху вниз: вордмарк LUCID и вход в музей; в центре — парящая
 * стеклянная сфера (шейдер в RecordCanvas за интерфейсом); ниже —
 * минималистичное поле названия, облако тегов по горизонтальным
 * рядам-категориям и пульсирующая кнопка «Соткать сон».
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RecordCanvas } from '../components/RecordCanvas';
import { TagPill } from '../components/TagPill';
import { WeaveButton } from '../components/WeaveButton';
import { GlassButton } from '../components/GlassButton';
import { GlassContainer } from '../components/GlassContainer';
import { colors, fonts, radius, type } from '../theme';
import { TAGS, TAG_CATEGORIES, type DreamTag } from '../core/tags';
import { createDreamEntry, dreamParamsForIds, rgbToHex, type DreamEntry } from '../core/dreamEngine';
import { haptic } from '../core/haptics';

export interface RecordScreenProps {
  onWeave: (dream: DreamEntry) => void;
  onOpenGallery: () => void;
}

export function RecordScreen({ onWeave, onOpenGallery }: RecordScreenProps) {
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  const params = useMemo(() => dreamParamsForIds(selected, 0.5), [selected]);
  const accentHex = useMemo(() => rgbToHex(params.accent), [params.accent]);

  const toggleTag = useCallback((tag: DreamTag) => {
    setSelected((prev) =>
      prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
    );
  }, []);

  const weave = useCallback(() => {
    const entry = createDreamEntry(title, selected);
    haptic.success();
    setTitle('');
    setSelected([]);
    inputRef.current?.blur();
    onWeave(entry);
  }, [onWeave, selected, title]);

  const canWeave = title.trim().length > 0 || selected.length > 0;

  return (
    <View style={styles.root}>
      <RecordCanvas params={params} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
          {/* --- шапка --- */}
          <View style={styles.headerRow}>
            <Text style={[type.wordmark, { fontSize: 13 }]}>LUCID</Text>
            <GlassButton
              label="Музей снов"
              icon="◈"
              onPress={onOpenGallery}
              hapticKind="light"
            />
          </View>

          {/* --- сфера (в канвасе за интерфейсом) + название сна --- */}
          <View style={styles.sphereZone} pointerEvents="box-none">
            <View style={styles.inputWrap}>
              <GlassContainer intensity={1.2} rounded={radius.pill}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="Название сна…"
                  placeholderTextColor={colors.textFaint}
                  value={title}
                  onChangeText={setTitle}
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  maxLength={80}
                  accessibilityLabel="Название сна"
                />
              </GlassContainer>
            </View>
          </View>

          {/* --- облако тегов + кнопка --- */}
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.bottomContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.tagSectionWrap}>
              {TAG_CATEGORIES.map((cat) => (
                <View key={cat.id} style={styles.tagSection}>
                  <Text style={styles.tagSectionLabel}>{cat.label}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tagRow}
                  >
                    {TAGS.filter((t) => t.category === cat.id).map((tag) => (
                      <TagPill
                        key={tag.id}
                        tag={tag}
                        selected={selected.includes(tag.id)}
                        onToggle={toggleTag}
                      />
                    ))}
                  </ScrollView>
                </View>
              ))}
            </View>

            <WeaveButton onPress={weave} glowColor={accentHex} disabled={!canWeave} />

            <Text style={styles.hint}>
              {selected.length > 0
                ? `Соткётся из ${selected.length} ${plural(selected.length, ['тега', 'тегов', 'тегов'])}`
                : 'Выберите теги — сфера откликнется сразу'}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Склонение русских числительных для подписи. */
function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 2,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  sphereZone: {
    flex: 0.62,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  inputWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 10,
    maxWidth: 640,
  },
  input: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15.5,
    color: colors.text,
    paddingHorizontal: 22,
    paddingVertical: 13,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  bottomContent: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    gap: 4,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  tagSectionWrap: {
    gap: 6,
    marginBottom: 14,
  },
  tagSection: {
    gap: 7,
  },
  tagSectionLabel: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textFaint,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    paddingLeft: 4,
  },
  tagRow: {
    gap: 8,
    paddingRight: 20,
    paddingVertical: 2,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
});
