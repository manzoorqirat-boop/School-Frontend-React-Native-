import React from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, font, shadow } from '@/theme';
import { GradientButton } from './ui';

// ── Screen scaffold: gradient top bar + back + scroll body ──────────────────
export function Screen({
  title, subtitle, colors: g = [colors.primary, colors.primaryDark], onBack, right, children, scroll = true,
}: {
  title: string; subtitle?: string; colors?: [string, string];
  onBack?: () => void; right?: React.ReactNode; children: React.ReactNode; scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const Body = scroll
    ? <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
        keyboardShouldPersistTaps="handled">{children}</ScrollView>
    : <View style={{ flex: 1 }}>{children}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.barRow}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            {subtitle ? <Text style={styles.barSub}>{subtitle}</Text> : null}
            <Text style={styles.barTitle}>{title}</Text>
          </View>
          {right}
        </View>
      </LinearGradient>
      {Body}
    </View>
  );
}

// ── Search bar ──────────────────────────────────────────────────────────────
export function SearchBar({ value, onChangeText, placeholder = 'Search…' }: {
  value: string; onChangeText: (t: string) => void; placeholder?: string;
}) {
  return (
    <View style={[styles.search, shadow.card]}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput style={styles.searchInput} value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor={colors.muted} autoCapitalize="none" />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── List row ────────────────────────────────────────────────────────────────
export function ListItem({
  title, subtitle, badge, badgeTint, leading, onPress,
}: {
  title: string; subtitle?: string; badge?: string; badgeTint?: string;
  leading?: React.ReactNode; onPress?: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.row, shadow.card]}>
      {leading}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: (badgeTint ?? colors.primary) + '18' }]}>
          <Text style={[styles.badgeText, { color: badgeTint ?? colors.primary }]}>{badge}</Text>
        </View>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </TouchableOpacity>
  );
}

// ── Circle avatar (initials) ────────────────────────────────────────────────
export function Avatar({ name, tint = colors.primary, size = 42 }: { name?: string; tint?: string; size?: number }) {
  const initials = (name ?? 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint + '22',
      alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: tint, fontWeight: '800', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

// ── Empty / loading / error states ──────────────────────────────────────────
export function EmptyState({ icon = 'file-tray', text }: { icon?: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={colors.muted} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}
export function Loading() {
  return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
}

// ── Form field ──────────────────────────────────────────────────────────────
export function Field({
  label, value, onChangeText, placeholder, keyboardType, secureTextEntry, autoCapitalize,
}: any) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput style={[styles.fieldInput, shadow.card]} value={value?.toString() ?? ''}
        onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted}
        keyboardType={keyboardType} secureTextEntry={secureTextEntry} autoCapitalize={autoCapitalize} />
    </View>
  );
}

// ── Picker (simple horizontal chips) ────────────────────────────────────────
export function ChipPicker({ label, options, value, onChange }: {
  label?: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map(o => {
          const on = o === value;
          return (
            <TouchableOpacity key={o} onPress={() => onChange(o)}
              style={[styles.pick, on && { backgroundColor: colors.primary }]}>
              <Text style={[styles.pickText, on && { color: '#fff' }]}>{o}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Bottom-sheet style form modal ───────────────────────────────────────────
export function FormModal({
  visible, title, onClose, onSubmit, submitLabel = 'Save', submitting, children,
}: {
  visible: boolean; title: string; onClose: () => void; onSubmit: () => void;
  submitLabel?: string; submitting?: boolean; children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ justifyContent: 'flex-end', flex: 1 }}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.slate} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.lg }}
              keyboardShouldPersistTaps="handled" style={{ maxHeight: 460 }}>
              {children}
            </ScrollView>
            <GradientButton label={submitLabel} onPress={onSubmit} loading={submitting} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center' },
  barTitle: { ...font.h2, color: '#fff' },
  barSub: { ...font.caption, color: 'rgba(255,255,255,0.8)' },

  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card,
    borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 48, marginBottom: spacing.md },
  searchInput: { flex: 1, ...font.body, color: colors.ink },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  rowTitle: { ...font.title, color: colors.ink },
  rowSub: { ...font.label, color: colors.muted, marginTop: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { ...font.caption },

  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyText: { ...font.body, color: colors.muted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },

  fieldLabel: { ...font.label, color: colors.slate },
  fieldInput: { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: spacing.lg,
    height: 50, ...font.body, color: colors.ink },

  pick: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.card, ...shadow.card },
  pickText: { ...font.label, color: colors.slate },

  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, gap: spacing.md },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...font.h3, color: colors.ink },
});

// ── Collapsible section (for long forms like the student form) ──────────────
export function Collapsible({
  title, subtitle, defaultOpen, children,
}: {
  title: string; subtitle?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  return (
    <View style={collStyles.wrap}>
      <TouchableOpacity onPress={() => setOpen(o => !o)} style={collStyles.head} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={collStyles.title}>{title}</Text>
          {subtitle ? <Text style={collStyles.sub}>{subtitle}</Text> : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.slate} />
      </TouchableOpacity>
      {open ? <View style={collStyles.body}>{children}</View> : null}
    </View>
  );
}

const collStyles = StyleSheet.create({
  wrap: { backgroundColor: colors.card, borderRadius: radius.md, marginBottom: spacing.sm, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  title: { ...font.title, color: colors.ink },
  sub: { ...font.label, color: colors.muted, marginTop: 1 },
  body: { padding: spacing.md, paddingTop: 0, gap: spacing.sm },
});