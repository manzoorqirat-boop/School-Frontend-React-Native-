import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, font, shadow } from '@/theme';

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE (Expo / React Native) toast.
//
// 16 screens already do `import { useToast } from '@/components/toast'` but the
// module was never committed, so Metro fails to resolve it and the app does not
// bundle. This file restores it with exactly the API those screens call:
//
//     const toast = useToast();
//     toast.success(title, message?)
//     toast.error(title, message?)
//     toast.warning(title, message?)      // NOTE: `warning`, not `warn`
//
// Mount <ToastProvider> in app/_layout.tsx (inside SafeAreaProvider, so the
// insets hook below resolves).
//
// Native-only by design: no Platform branches, no DOM APIs. Uses the native
// driver for the entrance animation since opacity/transform are both supported.
// ─────────────────────────────────────────────────────────────────────────────

type ToastKind = 'success' | 'error' | 'warning' | 'info';
type ToastItem = { id: number; kind: ToastKind; title: string; message?: string };

type ToastApi = {
  show: (kind: ToastKind, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const KIND: Record<ToastKind, { icon: keyof typeof Ionicons.glyphMap; tint: string }> = {
  success: { icon: 'checkmark-circle',   tint: colors.success },
  error:   { icon: 'alert-circle',       tint: colors.danger },
  warning: { icon: 'warning',            tint: colors.warning },
  info:    { icon: 'information-circle', tint: colors.info },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Record<number, any>>({});

  const remove = useCallback((id: number) => {
    setItems(prev => prev.filter(t => t.id !== id));
    if (timers.current[id]) { clearTimeout(timers.current[id]); delete timers.current[id]; }
  }, []);

  const show = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = nextId.current++;
    setItems(prev => [...prev.slice(-2), { id, kind, title, message }]);  // cap the stack at 3
    // Errors linger so they can be read; successes get out of the way.
    timers.current[id] = setTimeout(() => remove(id), kind === 'error' ? 5000 : 3000);
  }, [remove]);

  // Clear any pending timers if the provider unmounts.
  useEffect(() => () => {
    Object.values(timers.current).forEach(t => clearTimeout(t));
    timers.current = {};
  }, []);

  const api: ToastApi = React.useMemo(() => ({
    show,
    success: (t, m) => show('success', t, m),
    error:   (t, m) => show('error', t, m),
    warning: (t, m) => show('warning', t, m),
    info:    (t, m) => show('info', t, m),
  }), [show]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastStack items={items} onDismiss={remove} />
    </ToastCtx.Provider>
  );
}

function ToastStack({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  if (items.length === 0) return null;
  return (
    // pointerEvents="box-none" so the toast area never blocks taps on the
    // screen underneath — only the toast rows themselves are interactive.
    <View pointerEvents="box-none" style={[styles.stack, { top: insets.top + spacing.sm }]}>
      {items.map(item => <ToastRow key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />)}
    </View>
  );
}

function ToastRow({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
  }, [anim]);

  const { icon, tint } = KIND[item.kind];
  return (
    <Animated.View
      style={[
        styles.toast, shadow.float,
        {
          borderLeftColor: tint,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }],
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={tint} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        {item.message ? <Text style={styles.message} numberOfLines={4}>{item.message}</Text> : null}
      </View>
      <TouchableOpacity onPress={onDismiss} hitSlop={10}>
        <Ionicons name="close" size={18} color={colors.muted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute', left: 0, right: 0,
    paddingHorizontal: spacing.lg, gap: spacing.sm,
    zIndex: 9999, elevation: 9999,
  },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, borderLeftWidth: 4,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
  },
  title: { ...font.title, color: colors.ink },
  message: { ...font.label, color: colors.slate, marginTop: 1, textTransform: 'none', letterSpacing: 0 },
});
