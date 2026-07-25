import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Animated, AccessibilityInfo, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '@/theme';

/* ─── Manuscript palette ──────────────────────────────────────────────────
   From the QMSofts mark: a dark manuscript ground, gold calligraphy, an
   eight-point star, and the wordmark in spaced gold capitals.

   Deliberately NOT in the global theme. This is the one surface where the
   brand speaks; every other screen keeps the neutral system. Putting these in
   @/theme would invite them to leak across 25 screens and the restraint that
   makes the panel land would be gone. */
export const NIGHT      = '#131A2E';
export const NIGHT_2    = '#1D2742';
export const GOLD       = '#C9A227';
export const GOLD_LIGHT = '#EAD08A';
export const GOLD_DIM   = 'rgba(201,162,39,0.28)';

/* Palatino is the logo's own face and ships with iOS. Android has no Palatino,
   so `serif` maps to Noto Serif — same voice, no font file, no loading gate
   before first paint. */
export const SERIF = Platform.select({ ios: 'Palatino', android: 'serif', default: 'Georgia' });

/** Rub el Hizb — two squares at 45°, the star sitting behind the Q in the
 *  mark. Built from Views because that is genuinely all it is. */
export function StarMark({ size = 18, color = GOLD, width = 1 }) {
  const box = {
    position: 'absolute' as const,
    width: size, height: size, borderWidth: width, borderColor: color,
  };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={box} />
      <View style={[box, { transform: [{ rotate: '45deg' }] }]} />
    </View>
  );
}

export function greetingFor(d: Date) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * The brand panel at the top of a home screen.
 *
 * Shared by the staff dashboard and the parent portal so the two cannot drift
 * — they are the same moment for different audiences, and the previous
 * arrangement (portal plainer than dashboard) made the app feel like two
 * products.
 *
 * `ledger` is the signature: the day rolled up into one line from real data.
 * Callers assemble it, because only they know what is true for their audience.
 */
export function ColophonPanel({
  eyebrow, eyebrowDot, name, subtitle, ledgerLine, initials, onPressAvatar,
}: {
  eyebrow: string;
  eyebrowDot?: string;
  name: string;
  subtitle?: string;
  ledgerLine: string;
  initials: string;
  onPressAvatar: () => void;
}) {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const dateLine = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  /* One orchestrated entrance rather than scattered effects. Skipped entirely
     when the OS asks for reduced motion. */
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!alive) return;
      if (reduced) { enter.setValue(1); return; }
      Animated.timing(enter, {
        toValue: 1, duration: 520, delay: 60,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }).start();
    }).catch(() => enter.setValue(1));
    return () => { alive = false; };
  }, [enter]);

  return (
    <Animated.View style={{
      opacity: enter,
      transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }],
    }}>
      <LinearGradient
        colors={[NIGHT, NIGHT_2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.panel, { paddingTop: insets.top + spacing.lg }]}
      >
        {/* Oversized star bled off the corner — the mark as watermark, not as
            a badge stuck in a row of icons. */}
        <View style={styles.watermark} pointerEvents="none">
          <StarMark size={168} color="rgba(201,162,39,0.10)" width={1} />
        </View>

        <View style={styles.top}>
          <View style={styles.eyebrowPill}>
            {eyebrowDot ? <View style={[styles.dot, { backgroundColor: eyebrowDot }]} /> : null}
            <Text style={styles.eyebrowText}>{eyebrow}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <TouchableOpacity onPress={onPressAvatar} style={styles.iconBtn} hitSlop={6}>
              <Ionicons name="settings-outline" size={18} color={GOLD_LIGHT} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onPressAvatar} style={styles.avatar} hitSlop={6}>
              <Text style={styles.avatarText}>{initials}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.greeting}>
          {greetingFor(now)},{'\n'}
          <Text style={styles.greetingName}>{name}</Text>
        </Text>

        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle.toUpperCase()}</Text>
        ) : null}

        <View style={styles.ledger}>
          <StarMark size={13} color={GOLD} />
          <View style={{ flex: 1 }}>
            <Text style={styles.ledgerDate}>{dateLine.toUpperCase()}</Text>
            <Text style={styles.ledgerLine} numberOfLines={1}>{ledgerLine}</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: spacing.xl, paddingBottom: spacing.xl,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  watermark: { position: 'absolute', right: -54, top: -34 },

  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrowPill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill,
    borderWidth: 1, borderColor: GOLD_DIM,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  eyebrowText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1, color: GOLD_LIGHT, textTransform: 'uppercase' },

  iconBtn: {
    width: 36, height: 36, borderRadius: radius.md, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: GOLD_DIM,
  },
  avatar: {
    width: 36, height: 36, borderRadius: radius.md, alignItems: 'center',
    justifyContent: 'center', backgroundColor: GOLD,
  },
  avatarText: { color: NIGHT, fontSize: 13, fontWeight: '700' },

  // The one serif in the app, and the only place the brand voice speaks.
  greeting: { fontFamily: SERIF, fontSize: 27, lineHeight: 35, color: 'rgba(255,255,255,0.72)', marginTop: spacing.xl },
  greetingName: { color: GOLD_LIGHT },

  // Spaced capitals, echoing "QMSOFTS" along the foot of the mark.
  subtitle: { fontSize: 10, fontWeight: '600', letterSpacing: 2.2, color: 'rgba(255,255,255,0.42)', marginTop: spacing.sm },

  ledger: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginTop: spacing.xl, paddingTop: spacing.lg,
    borderTopWidth: 1, borderTopColor: GOLD_DIM,
  },
  ledgerDate: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, color: GOLD },
  ledgerLine: { fontSize: 14, color: 'rgba(255,255,255,0.88)', marginTop: 3 },
});