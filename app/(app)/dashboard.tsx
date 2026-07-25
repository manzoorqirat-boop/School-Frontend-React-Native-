import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
// Aliased: this component defines a LOCAL `can(key)` for menu-tile visibility.
// Importing under the same name puts the privilege check in that binding's
// temporal dead zone and throws during render.
import { can as hasPrivilege } from '@/lib/privileges';
import { useI18n } from '@/i18n';
import { API } from '@/lib/api';
import { colors, spacing, font, radius, roleAccent, roleLabel, moduleColor } from '@/theme';
import { ColophonPanel, GOLD } from '@/components/colophon';

export default function Dashboard() {
  const { user, school } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const accent = roleAccent(user?.role);

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<{ students?: number; feesOutstanding?: number }>({});
  const [pendingPolls, setPendingPolls] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);

  const canSeeBirthdays = hasPrivilege(user, 'birthday:view');

  const load = useCallback(async () => {
    try {
      const [s, f, pl, nt, bd] = await Promise.allSettled([
        API.get('/api/students?limit=1'),
        API.get('/api/invoices/reports/summary'),
        API.get('/api/polls'),
        API.get('/api/notices?limit=3'),
        // The server has no per-school timezone, so it trusts the client's
        // offset to decide what "today" is. Without this a UTC-hosted API
        // rolls the list over at 18:30 IST and shows tomorrow's birthdays.
        canSeeBirthdays
          ? API.get(`/api/birthdays?days=7&tzOffsetMinutes=${-new Date().getTimezoneOffset()}`)
          : Promise.resolve(null),
      ]);
      const next: any = {};
      if (s.status === 'fulfilled') next.students = s.value?.pagination?.total ?? s.value?.count;
      if (f.status === 'fulfilled') next.feesOutstanding = f.value?.outstanding;
      if (pl.status === 'fulfilled') {
        const list = Array.isArray(pl.value) ? pl.value : pl.value?.items ?? [];
        setPendingPolls(list.filter((x: any) => x.status === 'active' && !x.hasVoted));
      }
      if (nt.status === 'fulfilled') {
        const list = Array.isArray(nt.value) ? nt.value : nt.value?.items ?? [];
        setNotices(list);
      }
      if (bd.status === 'fulfilled' && bd.value) setBirthdays(bd.value.today ?? []);
      setStats(next);
    } catch {}
  }, [canSeeBirthdays]);
  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const r = user?.role ?? '';
  const can = (p: string) => {
    if (r === 'superadmin' || r === 'school_admin') return true;
    if (r === 'principal') return p !== 'users';
    if (r === 'accountant') return ['fees', 'payroll'].includes(p);
    if (r === 'teacher') return ['attendance', 'marks', 'my-classes'].includes(p);
    return false;
  };

  const initials = (user?.name ?? 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  const now = new Date();
  const dateLine = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  /* The strip's line is assembled from what is actually true today, in the
     order someone would want to hear it. When nothing is outstanding it says
     so plainly rather than hiding — an empty state is still information. */
  const ledger: string[] = [];
  if (canSeeBirthdays && birthdays.length)
    ledger.push(`${birthdays.length} ${birthdays.length === 1 ? 'birthday' : 'birthdays'}`);
  if (notices.length) ledger.push(`${notices.length} ${notices.length === 1 ? 'notice' : 'notices'}`);
  if (pendingPolls.length) ledger.push(`${pendingPolls.length} ${pendingPolls.length === 1 ? 'poll' : 'polls'} to answer`);
  const ledgerLine = ledger.length ? ledger.join('  ·  ') : 'Nothing needs you right now';

  /* Grouped, not one undifferentiated wall. A school_admin sees nineteen
     near-identical tiles; without partitions the eye has to read every label
     to find anything. The groups are the school's own departments, so the
     ordering carries real meaning rather than decorating the list. */
  const actions: { key: string; label: string; icon: any; route: string; show: boolean; group: string }[] = [
    { key: 'students', group: 'people', label: t('nav.students', 'Students'), icon: 'people-outline', route: '/(app)/students', show: true },
    { key: 'promote', group: 'people', label: t('nav.promote', 'Promote'), icon: 'trending-up-outline', route: '/(app)/promote', show: r === 'superadmin' || r === 'school_admin' || r === 'principal' },
    { key: 'attendance', group: 'people', label: t('nav.attendance', 'Attendance'), icon: 'checkbox-outline', route: '/(app)/attendance', show: true },
    { key: 'staff-attendance', group: 'people', label: t('nav.staffAttendance', 'Staff Attendance'), icon: 'briefcase-outline', route: '/(app)/teacher-attendance', show: r === 'superadmin' || r === 'school_admin' || r === 'principal' },
    { key: 'marks', group: 'academics', label: t('nav.marks', 'Marks Entry'), icon: 'create-outline', route: '/(app)/marks', show: ['superadmin', 'school_admin', 'principal', 'teacher'].includes(r) },
    { key: 'report-cards', group: 'academics', label: t('nav.reportCards', 'Report Cards'), icon: 'ribbon-outline', route: '/(app)/staff-report-cards', show: ['superadmin', 'school_admin', 'principal', 'teacher'].includes(r) },
    { key: 'my-classes', group: 'academics', label: t('nav.myClasses', 'My Classes'), icon: 'easel-outline', route: '/(app)/my-classes', show: r === 'teacher' },
    { key: 'exams', group: 'academics', label: t('nav.exams', 'Exams'), icon: 'document-text-outline', route: '/(app)/exams', show: true },
    { key: 'exam-config', group: 'academics', label: t('nav.examConfig', 'Exam Config'), icon: 'options-outline', route: '/(app)/exam-config', show: ['superadmin', 'school_admin', 'principal', 'teacher'].includes(r) },
    { key: 'fees', group: 'money', label: t('nav.fees', 'Fees'), icon: 'wallet-outline', route: '/(app)/fees', show: can('fees') },
    { key: 'fee-structures', group: 'money', label: t('nav.feeStructures', 'Fee Structures'), icon: 'pricetags-outline', route: '/(app)/fee-structures', show: can('fees') },
    { key: 'reports', group: 'money', label: t('nav.reports', 'Reports'), icon: 'stats-chart-outline', route: '/(app)/reports', show: ['superadmin', 'school_admin', 'principal', 'accountant', 'teacher'].includes(r) },
    { key: 'timetable', group: 'academics', label: t('nav.timetable', 'Timetable'), icon: 'calendar-outline', route: '/(app)/timetable', show: true },
    { key: 'payroll', group: 'money', label: t('nav.payroll', 'Payroll'), icon: 'cash-outline', route: '/(app)/payroll', show: can('payroll') },
    { key: 'salary-structures', group: 'money', label: t('nav.salaryStructures', 'Salary Structures'), icon: 'card-outline', route: '/(app)/salary-structures', show: can('payroll') },
    { key: 'notices', group: 'school', label: t('nav.notices', 'Notice Board'), icon: 'megaphone-outline', route: '/(app)/notices', show: true },
    { key: 'polls', group: 'school', label: t('nav.polls', 'Polls'), icon: 'bar-chart-outline', route: '/(app)/polls', show: true },
    { key: 'users', group: 'people', label: t('nav.users', 'Users'), icon: 'person-circle-outline', route: '/(app)/users', show: can('users') },
    { key: 'audit', group: 'people', label: t('nav.audit', 'Audit Log'), icon: 'time-outline', route: '/(app)/audit', show: can('users') },
  ].filter(a => a.show);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
        showsVerticalScrollIndicator={false}
      >
        <ColophonPanel
          eyebrow={roleLabel(user?.role)}
          eyebrowDot={accent}
          name={(user?.name ?? 'there').split(' ')[0]}
          subtitle={school?.name ?? 'Your school'}
          ledgerLine={ledgerLine}
          initials={initials}
          onPressAvatar={() => router.push('/(app)/settings')}
        />

        <View style={styles.body}>
          {/* Stats */}
          <View style={styles.statRow}>
            <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => router.push('/(app)/students' as any)}>
              <Text style={styles.statLabel}>Students</Text>
              <Text style={styles.statValue}>{stats.students ?? '—'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => router.push('/(app)/fees' as any)}>
              <Text style={styles.statLabel}>Outstanding</Text>
              <Text style={[styles.statValue, !!stats.feesOutstanding && { color: colors.warning }]}>
                {stats.feesOutstanding != null ? `₹${Number(stats.feesOutstanding).toLocaleString('en-IN')}` : '—'}
              </Text>
            </TouchableOpacity>
          </View>

          {(pendingPolls.length > 0 || (canSeeBirthdays && birthdays.length > 0) || notices.length > 0) && (
            <Text style={styles.eyebrow}>Needs attention</Text>
          )}

          {pendingPolls.length > 0 && (
            <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => router.push('/(app)/polls')}>
              <View style={styles.cardHead}>
                <Ionicons name="bar-chart" size={15} color={moduleColor('polls')} />
                <Text style={styles.cardTitle}>
                  {pendingPolls.length === 1 ? '1 poll needs your response' : `${pendingPolls.length} polls need your response`}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </View>
              <Text style={styles.cardSub} numberOfLines={1}>
                {pendingPolls.map((x: any) => x.title).join('  ·  ')}
              </Text>
            </TouchableOpacity>
          )}

          {notices.length > 0 && (
            <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => router.push('/(app)/notices' as any)}>
              <View style={styles.cardHead}>
                <Ionicons name="megaphone" size={15} color={moduleColor('notices')} />
                <Text style={styles.cardTitle}>Notice board</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </View>
              {notices.slice(0, 3).map((n: any) => (
                <View key={n._id} style={styles.noticeRow}>
                  {n.isPinned ? <Ionicons name="pin" size={11} color={moduleColor('notices')} /> : null}
                  <Text style={styles.noticeTitle} numberOfLines={1}>{n.title}</Text>
                  {n.priority === 'urgent' ? <View style={styles.urgentDot} /> : null}
                </View>
              ))}
            </TouchableOpacity>
          )}

          {canSeeBirthdays && birthdays.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Ionicons name="gift" size={15} color={moduleColor('birthdays')} />
                <Text style={styles.cardTitle}>
                  {birthdays.length === 1 ? 'Birthday today' : `${birthdays.length} birthdays today`}
                </Text>
              </View>
              <View style={styles.bdayList}>
                {birthdays.slice(0, 6).map((p: any) => (
                  <View key={p._id} style={styles.bdayChip}>
                    <Text style={styles.bdayName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.bdaySub} numberOfLines={1}>
                      {p.type === 'student' ? [p.class, p.section].filter(Boolean).join(' ') : roleLabel(p.role)}
                    </Text>
                  </View>
                ))}
              </View>
              {birthdays.length > 6 && <Text style={styles.bdaySub}>+{birthdays.length - 6} more</Text>}
            </View>
          )}

          {GROUPS.map(g => {
            const items = actions.filter(a => a.group === g.key);
            if (!items.length) return null;
            return (
              <View key={g.key}>
                <Text style={styles.eyebrow}>{g.label}</Text>
                <View style={styles.grid}>
                  {items.map(a => (
                    <TouchableOpacity key={a.key} style={styles.tile} activeOpacity={0.7} onPress={() => router.push(a.route as any)}>
                      <View style={[styles.tileIcon, { backgroundColor: moduleColor(a.key) + '14' }]}>
                        <Ionicons name={a.icon} size={19} color={moduleColor(a.key)} />
                      </View>
                      <Text style={styles.tileLabel} numberOfLines={2}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                  {/* Spacers keep a trailing row of one or two tiles left-aligned
                      under space-between, which would otherwise push a lone tile
                      to the far edge. */}
                  {items.length % 3 === 2 ? <View style={{ width: TILE }} /> : null}
                  {items.length % 3 === 1 ? <><View style={{ width: TILE }} /><View style={{ width: TILE }} /></> : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const GROUPS = [
  { key: 'people',    label: 'People' },
  { key: 'academics', label: 'Academics' },
  { key: 'money',     label: 'Fees & payroll' },
  { key: 'school',    label: 'School' },
];

const TILE = '31%';
const styles = StyleSheet.create({


  // The one serif on the screen, and the only place the brand voice speaks.

  // Spaced capitals, echoing "QMSOFTS" along the foot of the mark.


  body: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },

  statRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, padding: spacing.lg,
  },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: colors.muted, textTransform: 'uppercase' },
  statValue: { ...font.h1, color: colors.ink, marginTop: spacing.sm },

  eyebrow: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: colors.muted,
    textTransform: 'uppercase', marginTop: spacing.xxl, marginBottom: spacing.md,
  },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.line, padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { ...font.body, color: colors.ink, fontWeight: '700', flex: 1 },
  cardSub: { ...font.caption, color: colors.muted, textTransform: 'none', letterSpacing: 0 },

  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noticeTitle: { ...font.body, color: colors.slate, flex: 1 },
  urgentDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },

  bdayList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bdayChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, backgroundColor: colors.surfaceAlt, maxWidth: '48%',
  },
  bdayName: { ...font.body, color: colors.ink, fontWeight: '600' },
  bdaySub: { ...font.caption, color: colors.muted, textTransform: 'none', letterSpacing: 0, marginTop: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  tile: {
    width: TILE, aspectRatio: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, padding: spacing.md, justifyContent: 'space-between',
  },
  tileIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 12, fontWeight: '600', color: colors.ink, lineHeight: 15 },
});