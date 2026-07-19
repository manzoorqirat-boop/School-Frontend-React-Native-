import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/i18n';
import { API } from '@/lib/api';
import { themeForRole, colors, spacing, font, radius } from '@/theme';
import { GradientHeader, StatTile, ActionCard } from '@/components/ui';

export default function Dashboard() {
  const { user, school, signOut } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
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

  const can = (p: string) => {
    const r = user?.role ?? '';
    if (r === 'superadmin' || r === 'school_admin') return true;
    if (r === 'principal') return p !== 'users';            // principal: all but user mgmt
    if (r === 'accountant') return ['fees', 'payroll'].includes(p);
    if (r === 'teacher') return ['attendance'].includes(p);
    return false;
  };

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
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => router.push('/(app)/settings')} style={styles.avatar}>
              <Ionicons name="settings-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={signOut} style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.name ?? 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
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
      <Text style={styles.section}>{t('dashboard.quickActions', 'Quick actions')}</Text>
      <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
        {user?.role === 'teacher' && <ActionCard title={t('nav.myClasses', 'My Classes')} subtitle="Your assigned classes" icon="easel" tint={colors.violet} onPress={() => router.push('/(app)/my-classes')} />}
        {user?.role === 'teacher' && <ActionCard title={t('nav.marks', 'Marks Entry')} subtitle="Enter exam marks" icon="create" tint={colors.sky} onPress={() => router.push('/(app)/marks')} />}
        <ActionCard title={t('nav.students', 'Students')} subtitle="Enrolment, profiles, promotion" icon="people" tint={colors.violet} onPress={() => router.push('/(app)/students')} />
        <ActionCard title={t('nav.attendance', 'Attendance')} subtitle="Mark & review daily attendance" icon="checkbox" tint={colors.emerald} onPress={() => router.push('/(app)/attendance')} />
        <ActionCard title={t('nav.exams', 'Exams & Marks')} subtitle="Marksheets and report cards" icon="document-text" tint={colors.sky} onPress={() => router.push('/(app)/exams')} />
        {can('fees') && <ActionCard title={t('nav.fees', 'Fees')} subtitle="Invoices, collection, reports" icon="wallet" tint={colors.amber} onPress={() => router.push('/(app)/fees')} />}
        <ActionCard title={t('nav.timetable', 'Timetable')} subtitle="Class schedules" icon="calendar" tint={colors.indigo} onPress={() => router.push('/(app)/timetable')} />
        {can('payroll') && <ActionCard title={t('nav.payroll', 'Payroll')} subtitle="Salaries and payslips" icon="cash" tint={colors.rose} onPress={() => router.push('/(app)/payroll')} />}
      </View>

      <Text style={styles.section}>{t('dashboard.more', 'More')}</Text>
      <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
        <ActionCard title={t('nav.polls', 'Polls')} subtitle="Create & view feedback" icon="bar-chart" tint={colors.pink} onPress={() => router.push('/(app)/polls')} />
        {can('users') && <ActionCard title={t('nav.users', 'Users')} subtitle="Staff & parent accounts" icon="person-circle" tint={colors.indigo} onPress={() => router.push('/(app)/users')} />}
        {can('audit') && <ActionCard title={t('nav.audit', 'Audit Log')} subtitle="Activity history" icon="time" tint={colors.slate} onPress={() => router.push('/(app)/audit')} />}
        {can('fees') && <ActionCard title={t('nav.feeStructures', 'Fee Structures')} subtitle="Heads & installments" icon="pricetags" tint={colors.amber} onPress={() => router.push('/(app)/fee-structures')} />}
        {can('users') && <ActionCard title={t('nav.privileges', 'Privileges')} subtitle="Role permissions" icon="shield-checkmark" tint={colors.violet} onPress={() => router.push('/(app)/privileges')} />}
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