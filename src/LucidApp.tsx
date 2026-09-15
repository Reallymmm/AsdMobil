/**
 * Корень LUCID: шрифты, хранилище снов, провайдер контекста, навигатор.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Unbounded_300Light,
  Unbounded_400Regular,
  Unbounded_600SemiBold,
} from '@expo-google-fonts/unbounded';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { AppNavigator } from './navigation/AppNavigator';
import { colors, fonts } from './theme';
import { loadDreams, saveDreams } from './core/storage';
import type { DreamEntry } from './core/dreamEngine';

interface DreamsContextValue {
  dreams: DreamEntry[];
  loaded: boolean;
  addDream: (dream: DreamEntry) => void;
  removeDream: (id: string) => void;
}

const DreamsContext = createContext<DreamsContextValue>({
  dreams: [],
  loaded: false,
  addDream: () => {},
  removeDream: () => {},
});

export function useDreams(): DreamsContextValue {
  return useContext(DreamsContext);
}

/** Заставка на время загрузки шрифтов и CanvasKit. */
export function SplashFallback() {
  return (
    <View style={splashStyles.root}>
      <Text style={splashStyles.mark}>LUCID</Text>
      <Text style={splashStyles.sub}>дневник снов</Text>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mark: {
    fontFamily: 'System',
    fontSize: 26,
    fontWeight: '300',
    letterSpacing: 12,
    color: colors.text,
  },
  sub: {
    fontFamily: 'System',
    fontSize: 13,
    color: colors.textFaint,
    letterSpacing: 3,
  },
});

export default function LucidApp() {
  const [fontsLoaded] = useFonts({
    [fonts.displayLight]: Unbounded_300Light,
    [fonts.display]: Unbounded_400Regular,
    [fonts.displayBold]: Unbounded_600SemiBold,
    [fonts.body]: Manrope_400Regular,
    [fonts.bodyMedium]: Manrope_500Medium,
    [fonts.bodyBold]: Manrope_700Bold,
  });

  const [dreams, setDreams] = useState<DreamEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadDreams().then((d) => {
      setDreams(d);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) saveDreams(dreams);
  }, [dreams, loaded]);

  const addDream = useCallback((dream: DreamEntry) => {
    setDreams((prev) => [dream, ...prev]);
  }, []);

  const removeDream = useCallback((id: string) => {
    setDreams((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const ctx = useMemo(
    () => ({ dreams, loaded, addDream, removeDream }),
    [dreams, loaded, addDream, removeDream],
  );

  if (!fontsLoaded) return <SplashFallback />;

  return (
    <DreamsContext.Provider value={ctx}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppNavigator
          dreams={dreams}
          onWeave={addDream}
          onDeleteDream={(dream) => removeDream(dream.id)}
        />
      </SafeAreaProvider>
    </DreamsContext.Provider>
  );
}
