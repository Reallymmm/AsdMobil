/**
 * Веб-точка входа.
 *
 * Skia на вебе работает через CanvasKit (WASM). Загружаем его ДО
 * импорта приложения (ленивый компонент), иначе global.CanvasKit
 * окажется undefined. canvaskit.wasm лежит в public/ и отдаётся
 * статикой (см. README, раздел «Веб»).
 *
 * ВАЖНО: сюда нельзя статически импортировать ничего из src/,
 * что тянет за собой @shopify/react-native-skia — иначе граф
 * модулей вычислится раньше загрузки CanvasKit.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

function SplashFallback() {
  return (
    <View style={styles.root}>
      <Text style={styles.mark}>LUCID</Text>
      <Text style={styles.sub}>дневник снов</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#05070F',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mark: {
    fontFamily: 'System',
    fontSize: 26,
    fontWeight: '300',
    letterSpacing: 12,
    color: '#EAF2FF',
  },
  sub: {
    fontFamily: 'System',
    fontSize: 13,
    color: 'rgba(234,242,255,0.38)',
    letterSpacing: 3,
  },
});

export default function App() {
  return (
    <WithSkiaWeb
      getComponent={() => require('./src/LucidApp')}
      fallback={<SplashFallback />}
      opts={{ locateFile: () => 'canvaskit.wasm' }}
    />
  );
}
