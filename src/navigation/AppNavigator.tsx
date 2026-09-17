/**
 * Лёгкий стек-навигатор с «текучими» пружинными переходами (Шаг 6 ТЗ).
 *
 * При push новый экран всплывает снизу с мягким спрингом (damping 22,
 * mass 1.05), уходящий экран уменьшается и растворяется; при pop —
 * обратное движение. Никаких резких линий — только упругое движение.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type AnimatedStyle,
} from 'react-native-reanimated';
import { RecordScreen } from '../screens/RecordScreen';
import { VisualizerScreen } from '../screens/VisualizerScreen';
import { GalleryScreen } from '../screens/GalleryScreen';
import type { DreamEntry } from '../core/dreamEngine';

export type Route =
  | { name: 'record'; editId?: string }
  | { name: 'visualizer'; dreamId: string }
  | { name: 'gallery' };

export interface AppNavigatorApi {
  push: (route: Route) => void;
  pop: () => void;
  /** вернуться к ближайшему экрану с этим именем (или сделать push) */
  popTo: (name: Route['name']) => void;
}

export interface AppNavigatorProps {
  dreams: DreamEntry[];
  onWeave: (dream: DreamEntry) => void;
  onUpdateDream: (dream: DreamEntry) => void;
  onDeleteDream: (dream: DreamEntry) => void;
}

const TRANSITION_SPRING = { damping: 22, mass: 1.05, stiffness: 130, overshootClamping: false };

function AnimatedScreen({
  style,
  children,
}: {
  style: AnimatedStyle<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <Animated.View style={[styles.screen, style]} pointerEvents="auto">
      {children}
    </Animated.View>
  );
}

export function AppNavigator({
  dreams,
  onWeave,
  onUpdateDream,
  onDeleteDream,
}: AppNavigatorProps) {
  const [stack, setStack] = useState<Route[]>([{ name: 'record' }]);
  const [leaving, setLeaving] = useState<Route | null>(null);
  const progress = useSharedValue(1);
  const dir = useSharedValue(1);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const busyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    busyRef.current = false;
    setLeaving(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const animate = useCallback(
    (d: 1 | -1) => {
      dir.value = d;
      progress.value = 0;
      progress.value = withSpring(1, TRANSITION_SPRING, (finished) => {
        if (finished) runOnJS(finish)();
      });
      // страховка на случай перехвата анимации
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(finish, 750);
    },
    [dir, finish, progress],
  );

  const push = useCallback(
    (route: Route) => {
      if (busyRef.current) return;
      const cur = stackRef.current[stackRef.current.length - 1];
      const same =
        (cur.name === route.name && route.name !== 'visualizer') ||
        (route.name === 'visualizer' && cur.name === 'visualizer' && cur.dreamId === route.dreamId);
      if (same) return;
      busyRef.current = true;
      setLeaving(cur);
      setStack((s) => [...s, route]);
      animate(1);
    },
    [animate],
  );

  const pop = useCallback(() => {
    if (busyRef.current || stackRef.current.length <= 1) return;
    busyRef.current = true;
    setLeaving(stackRef.current[stackRef.current.length - 1]);
    setStack((s) => s.slice(0, -1));
    animate(-1);
  }, [animate]);

  const popTo = useCallback(
    (name: Route['name']) => {
      const idx = stackRef.current.findIndex((r) => r.name === name);
      if (idx >= 0 && idx < stackRef.current.length - 1) {
        if (busyRef.current) return;
        busyRef.current = true;
        setLeaving(stackRef.current[stackRef.current.length - 1]);
        setStack(stackRef.current.slice(0, idx + 1));
        animate(-1);
      } else if (idx === -1) {
        push({ name } as Route);
      }
    },
    [animate, push],
  );

  const nav = useMemo<AppNavigatorApi>(() => ({ push, pop, popTo }), [pop, popTo, push]);

  const renderRecord = useCallback(
    (editId?: string) => {
      const editing = editId ? dreams.find((d) => d.id === editId) : undefined;
      if (editing) {
        return (
          <RecordScreen
            initial={editing}
            onWeave={() => {}}
            onUpdate={(dream) => {
              onUpdateDream(dream);
              nav.pop();
            }}
            onOpenGallery={() => nav.popTo('gallery')}
            onBack={() => nav.pop()}
          />
        );
      }
      return (
        <RecordScreen
          onWeave={(dream) => {
            onWeave(dream);
            nav.push({ name: 'visualizer', dreamId: dream.id });
          }}
          onUpdate={() => {}}
          onOpenGallery={() => nav.popTo('gallery')}
        />
      );
    },
    [dreams, nav, onUpdateDream, onWeave],
  );

  const renderScreen = useCallback(
    (route: Route) => {
      switch (route.name) {
        case 'record':
          return renderRecord(route.editId);
        case 'visualizer': {
          const dream = dreams.find((d) => d.id === route.dreamId) ?? dreams[0];
          if (!dream) return renderRecord();
          return (
            <VisualizerScreen
              dream={dream}
              onBack={() => nav.pop()}
              onOpenGallery={() => nav.popTo('gallery')}
              onNewDream={() => nav.popTo('record')}
            />
          );
        }
        case 'gallery':
          return (
            <GalleryScreen
              dreams={dreams}
              onOpenDream={(dream) => nav.push({ name: 'visualizer', dreamId: dream.id })}
              onEditDream={(dream) => nav.push({ name: 'record', editId: dream.id })}
              onDeleteDream={onDeleteDream}
              onBack={() => nav.popTo('record')}
              onNewDream={() => nav.popTo('record')}
            />
          );
      }
    },
    [dreams, nav, onDeleteDream, onWeave, renderRecord],
  );

  const enterStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;
    const d = dir.value;
    return {
      transform: [{ translateY: (1 - p) * 42 * d }, { scale: 0.965 + 0.035 * p }],
      opacity: p,
    };
  });

  const exitStyle = useAnimatedStyle(() => {
    'worklet';
    const p = progress.value;
    const d = dir.value;
    return {
      transform: [{ translateY: p * -26 * d }, { scale: 1 - 0.06 * p }],
      opacity: 1 - p * 0.92,
    };
  });

  const current = stack[stack.length - 1];

  return (
    <View style={styles.root}>
      {leaving ? (
        <AnimatedScreen style={exitStyle}>{renderScreen(leaving)}</AnimatedScreen>
      ) : null}
      <AnimatedScreen style={enterStyle}>{renderScreen(current)}</AnimatedScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flex: 1 },
});
