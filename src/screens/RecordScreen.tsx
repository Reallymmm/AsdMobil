/**
 * ЭКРАН 1 — «Призма»: запись сна (и редактирование сохранённого).
 *
 * Сверху вниз: вордмарк LUCID и вход в музей; в центре — парящая
 * стеклянная сфера (шейдер в RecordCanvas за интерфейсом); ниже —
 * минималистичное поле названия, заметка сна, облако тегов по
 * горизонтальным рядам-категориям и пульсирующая кнопка «Соткать сон».
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
import {
  createDreamEntry,
  dreamParamsForIds,
  rgbToHex,
  updateDreamEntry,
  type DreamEntry,
} from '../core/dreamEngine';
import { haptic } from '../core/haptics';

export interface RecordScreenProps {
  /** редактируемая запись (null — создание нового сна) */
  initial?: DreamEntry | null;
  onWeave: (dream: DreamEntry) => void;
  /** сохранение правок существующего сна */
  onUpdate: (dream: DreamEntry) => void;
  onOpenGallery: () => void;
  /** назад (показывается в режиме редактирования) */
  onBack?: () => void;
}

export function RecordScreen({
  initial = null,
  onWeave,
  onUpdate,
  onOpenGallery,
  onBack,
}: RecordScreenProps) {
  const editing = initial !== null;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [selected, setSelected] = useState<string[]>(initial?.tags ?? []);
  const inputRef = useRef<TextInput>(null);

  const params = useMemo(() => dreamParamsForIds(selected, 0.5), [selected]);
  const accentHex = useMemo(() => rgbToHex(params.accent), [params.accent]);

  const toggleTag = useCallback((tag: DreamTag) => {
    setSelected((prev) =>
      prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
    );
  }, []);

  const weave = useCallback(() => {
    if (editing && initial) {
      haptic.success();
      inputRef.current?.blur();
      onUpdate(updateDreamEntry(initial, title, selected, note));
      return;
    }
    const entry = createDreamEntry(title, selected, note);
    haptic.success();
    setTitle('');
    setNote('');
    setSelected([]);
    inputRef.current?.blur();
    onWeave(entry);
  }, [editing, initial, note, onWeave, onUpdate, selected, title]);

  const canWeave = title.trim().length > 0 || selected.length > 0 || note.trim().length > 0;

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
            {editing && onBack ? (
              <GlassButton label="‹ Назад" onPress={onBack} hapticKind="light" />
            ) : (
              <Text style={[type.wordmark, { fontSize: 13 }]}>LUCID</Text>
            )}
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
                  placeholder={editing ? 'Название сна…' : 'Как назвать этот сон?…'}
                  placeholderTextColor={colors.textFaint}
                  value={title}
                  onChangeText={setTitle}
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  maxLength={80}
                  accessibilityLabel="Название сна"
                />
              </GlassContainer>
              <GlassContainer intensity={0.9} rounded={radius.m} style={styles.noteWrap}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Детали сна: что вы видели, что чувствовали…"
                  placeholderTextColor={colors.textFaint}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  maxLength={2000}
                  accessibilityLabel="Детали сна"
                />
                {note.length > 0 ? (
                  <Text style={styles.noteCounter}>{note.length}/2000</Text>
                ) : null}
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

            <WeaveButton
              onPress={weave}
              glowColor={accentHex}
              disabled={!canWeave}
              label={editing ? '✦ СОХРАНИТЬ СОН' : '✦ СОТКАТЬ СОН'}
            />

            <Text style={styles.hint}>
              {editing
                ? 'Правки сохранятся в музей снов'
                : selected.length > 0
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
    flex: 0.52,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  inputWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 10,
    maxWidth: 640,
    gap: 8,
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
  noteWrap: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  noteInput: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textDim,
    minHeight: 58,
    maxHeight: 110,
    textAlignVertical: 'top',
  },
  noteCounter: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    color: colors.textFaint,
    alignSelf: 'flex-end',
    marginTop: 4,
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
