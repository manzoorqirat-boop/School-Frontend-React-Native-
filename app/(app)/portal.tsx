import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { API } from '@/lib/api';
import { themeForRole, colors, spacing, font, radius } from '@/theme';
import { GradientHeader, StatTile, ActionCard } from '@/components/ui';

// Parent + student portal.
export default function Portal() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const rt = themeForRole(user?.role);
  const [refreshing, setRefreshing] = useState(false);
  const [attendancePct, setAttendancePct] = useState<number | null>(null);
  const [feesDue, setFeesDue] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const sid = user?.studentId || (Array.isArray(user?.parentOf) ? user!.parentOf[0] : null);
      if (sid) {
        const att = await API.get(`/api/attendance/student/${sid}`).catch(() => null);
        if (att?.summary?.percentage != null) setAttendancePct(att.summary.percentage);
      }
      const inv = await API.get('/api/invoices?limit=50').catch(() => null);
      const items = inv?.items ?? [];
      const due = items.reduce((a: number, i: any) => a + Math.max(0, (i.total ?? 0) - (i.amountPaid ?? 0)), 0);
      setFeesDue(due);
    } catch {}
  }, [user]);
  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={rt.accent} />}>
      <GradientHeader colors={rt.gradient} subtitle={rt.label}
        title={`Hi, ${(user?.name ?? 'there').split(' ')[0]} 👋`}
        right={<TouchableOpacity onPress={signOut} style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name ?? 'U').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</Text>
        </TouchableOpacity>} />
      <View style={styles.statRow}>
        <StatTile label="Attendance" value={attendancePct != null ? `${attendancePct}%` : '—'} icon="checkbox" tint={colors.emerald} />
        <StatTile label="Fees Due" value={feesDue != null ? `₹${Number(feesDue).toLocaleString('en-IN')}` : '—'} icon="wallet" tint={colors.amber} />
      </View>
      <Text style={styles.section}>Explore</Text>
      <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
        <ActionCard title="Attendance" subtitle="Daily record & summary" icon="checkbox" tint={colors.emerald} />
        <ActionCard title="Report Cards" subtitle="Exam results & grades" icon="ribbon" tint={colors.sky} />
        <ActionCard title="Fees" subtitle="Invoices & pay online" icon="wallet" tint={colors.amber} />
        <ActionCard title="Timetable" subtitle="Class schedule" icon="calendar" tint={colors.indigo} />
        <ActionCard title="Polls" subtitle="Vote & share feedback" icon="bar-chart" tint={colors.pink} />
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  statRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, marginTop: -spacing.lg },
  section: { ...font.h3, color: colors.ink, paddingHorizontal: spacing.xl, marginTop: spacing.xl, marginBottom: spacing.md },
});
