import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { API } from '@/lib/api';
import { themeForRole, colors, spacing, font, radius } from '@/theme';
import { GradientHeader, StatTile, ActionCard } from '@/components/ui';

export default function Dashboard() {
  const { user, school, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const rt = themeForRole(user?.role);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<{ students?: number; feesOutstanding?: number; attendancePct?: number }>({});

  const load = useCallback(async () => {
    try {
      // Best-effort parallel fetch; each guarded so a missing endpoint doesn't
      // blank the screen.
      const [studentsRes, feeRes] = await Promise.allSettled([
        API.get('/api/students?limit=1'),
        API.get('/api/invoices/reports/summary'),
      ]);
      const next: any = {};
      if (studentsRes.status === 'fulfilled')
        next.students = studentsRes.value?.pagination?.total ?? studentsRes.value?.count;
      if (feeRes.status === 'fulfilled')
        next.feesOutstanding = feeRes.value?.outstanding;
      setStats(next);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const can = (p: string) => user?.role === 'superadmin' || ['school_admin', 'principal'].includes(user?.role ?? '')
    || (p === 'fees' && user?.role === 'accountant')
    || (p === 'attendance' && user?.role === 'teacher');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={rt.accent} />}
    >
      <GradientHeader
        colors={rt.gradient}
        subtitle={rt.label}
        title={`Hi, ${(user?.name ?? 'there').split(' ')[0]} 👋`}
        right={
          <TouchableOpacity onPress={signOut} style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name ?? 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
            </Text>
          </TouchableOpacity>
        }
      >
        <Text style={styles.schoolName}>{school?.name ?? 'Your school'}</Text>
      </GradientHeader>

      {/* Stats */}
      <View style={styles.statRow}>
        <StatTile label="Students" value={stats.students ?? '—'} icon="people" tint={colors.violet} />
        <StatTile label="Fees Due" value={stats.feesOutstanding != null ? `₹${Number(stats.feesOutstanding).toLocaleString('en-IN')}` : '—'} icon="wallet" tint={colors.amber} />
      </View>

      {/* Quick actions */}
      <Text style={styles.section}>Quick actions</Text>
      <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
        <ActionCard title="Students" subtitle="Enrolment, profiles, promotion" icon="people" tint={colors.violet} />
        <ActionCard title="Attendance" subtitle="Mark & review daily attendance" icon="checkbox" tint={colors.emerald} />
        <ActionCard title="Exams & Marks" subtitle="Marksheets and report cards" icon="document-text" tint={colors.sky} />
        {can('fees') && <ActionCard title="Fees" subtitle="Invoices, collection, reports" icon="wallet" tint={colors.amber} />}
        <ActionCard title="Timetable" subtitle="Class schedules" icon="calendar" tint={colors.indigo} />
        {can('payroll') && <ActionCard title="Payroll" subtitle="Salaries and payslips" icon="cash" tint={colors.rose} />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  schoolName: { ...font.label, color: 'rgba(255,255,255,0.9)', marginTop: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, marginTop: -spacing.lg },
  section: { ...font.h3, color: colors.ink, paddingHorizontal: spacing.xl, marginTop: spacing.xl, marginBottom: spacing.md },
});
