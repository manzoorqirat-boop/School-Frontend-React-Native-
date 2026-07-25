import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  Platform, Animated, AccessibilityInfo, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
// Aliased: this component defines a LOCAL `can(key)` for menu-tile visibility.
// Importing under the same name puts the privilege check in that binding's
// temporal dead zone and throws during render.
import { can as hasPrivilege } from '@/lib/privileges';
import { useI18n } from '@/i18n';
import { API } from '@/lib/api';
import { colors, spacing, font, radius, roleAccent, roleLabel, moduleColor } from '@/theme';

/* ─── Manuscript palette ──────────────────────────────────────────────────
   Taken from the QMSofts mark: a dark manuscript ground, gold calligraphy,
   an eight-point star, and the wordmark in spaced gold capitals. Scoped to
   this screen on purpose — the panel is the one place the brand speaks, and
   every other screen keeps the neutral system so the app stays coherent. */
const NIGHT     = '#131A2E';
const NIGHT_2   = '#1D2742';
const GOLD      = '#C9A227';
const GOLD_LIGHT = '#EAD08A';
const GOLD_DIM  = 'rgba(201,162,39,0.28)';

/* Palatino is the logo's own face and ships with iOS. Android has no Palatino,
   so `serif` maps to Noto Serif — same voice, no font file to load, no
   loading gate before first paint. */
const SERIF = Platform.select({ ios: 'Palatino', android: 'serif', default: 'Georgia' });

/** Rub el Hizb — two squares at 45°, the star sitting behind the Q in the
 *  mark. Built from Views because that is genuinely all it is. */
function StarMark({ size = 18, color = GOLD, width = 1 }) {
  const box = { position: 'absolute' as const, width: size, height: size, borderWidth: width, borderColor: color };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={box} />
      <View style={[box, { transform: [{ rotate: '45deg' }] }]} />
    </View>
  );
}

function greetingFor(d: Date) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

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

  /* One orchestrated entrance rather than scattered effects: the panel settles
     and the ledger strip follows. Skipped entirely when the OS asks for
     reduced motion. */
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

  const actions: { key: string; label: string; icon: any; route: string; show: boolean }[] = [
    { key: 'students', label: t('nav.students', 'Students'), icon: 'people-outline', route: '/(app)/students', show: true },
    { key: 'promote', label: t('nav.promote', 'Promote'), icon: 'trending-up-outline', route: '/(app)/promote', show: r === 'superadmin' || r === 'school_admin' || r === 'principal' },
    { key: 'attendance', label: t('nav.attendance', 'Attendance'), icon: 'checkbox-outline', route: '/(app)/attendance', show: true },
    { key: 'staff-attendance', label: t('nav.staffAttendance', 'Staff Attendance'), icon: 'briefcase-outline', route: '/(app)/teacher-attendance', show: r === 'superadmin' || r === 'school_admin' || r === 'principal' },
    { key: 'marks', label: t('nav.marks', 'Marks Entry'), icon: 'create-outline', route: '/(app)/marks', show: ['superadmin', 'school_admin', 'principal', 'teacher'].includes(r) },
    { key: 'report-cards', label: t('nav.reportCards', 'Report Cards'), icon: 'ribbon-outline', route: '/(app)/staff-report-cards', show: ['superadmin', 'school_admin', 'principal', 'teacher'].includes(r) },
    { key: 'my-classes', label: t('nav.myClasses', 'My Classes'), icon: 'easel-outline', route: '/(app)/my-classes', show: r === 'teacher' },
    { key: 'exams', label: t('nav.exams', 'Exams'), icon: 'document-text-outline', route: '/(app)/exams', show: true },
    { key: 'exam-config', label: t('nav.examConfig', 'Exam Config'), icon: 'options-outline', route: '/(app)/exam-config', show: ['superadmin', 'school_admin', 'principal', 'teacher'].includes(r) },
    { key: 'fees', label: t('nav.fees', 'Fees'), icon: 'wallet-outline', route: '/(app)/fees', show: can('fees') },
    { key: 'fee-structures', label: t('nav.feeStructures', 'Fee Structures'), icon: 'pricetags-outline', route: '/(app)/fee-structures', show: can('fees') },
    { key: 'reports', label: t('nav.reports', 'Reports'), icon: 'stats-chart-outline', route: '/(app)/reports', show: ['superadmin', 'school_admin', 'principal', 'accountant', 'teacher'].includes(r) },
    { key: 'timetable', label: t('nav.timetable', 'Timetable'), icon: 'calendar-outline', route: '/(app)/timetable', show: true },
    { key: 'payroll', label: t('nav.payroll', 'Payroll'), icon: 'cash-outline', route: '/(app)/payroll', show: can('payroll') },
    { key: 'salary-structures', label: t('nav.salaryStructures', 'Salary Structures'), icon: 'card-outline', route: '/(app)/salary-structures', show: can('payroll') },
    { key: 'notices', label: t('nav.notices', 'Notice Board'), icon: 'megaphone-outline', route: '/(app)/notices', show: true },
    { key: 'polls', label: t('nav.polls', 'Polls'), icon: 'bar-chart-outline', route: '/(app)/polls', show: true },
    { key: 'users', label: t('nav.users', 'Users'), icon: 'person-circle-outline', route: '/(app)/users', show: can('users') },
    { key: 'audit', label: t('nav.audit', 'Audit Log'), icon: 'time-outline', route: '/(app)/audit', show: can('users') },
  ].filter(a => a.show);

  const panelStyle = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }],
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Colophon panel ─────────────────────────────────────────────
            Bleeds to the screen edges and carries the brand alone. */}
        <Animated.View style={panelStyle}>
          <LinearGradient
            colors={[NIGHT, NIGHT_2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.panel, { paddingTop: insets.top + spacing.lg }]}
          >
            {/* Oversized star, bled off the corner — the mark as watermark,
                not as a badge stuck in a row of icons. */}
            <View style={styles.watermark} pointerEvents="none">
              <StarMark size={168} color="rgba(201,162,39,0.10)" width={1} />
            </View>

            <View style={styles.panelTop}>
              <View style={styles.roleRow}>
                <View style={[styles.roleDot, { backgroundColor: accent }]} />
                <Text style={styles.roleText}>{roleLabel(user?.role)}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <TouchableOpacity onPress={() => router.push('/(app)/settings')} style={styles.iconBtn} hitSlop={6}>
                  <Ionicons name="settings-outline" size={18} color={GOLD_LIGHT} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/(app)/settings')} style={styles.avatar} hitSlop={6}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.greeting}>
              {greetingFor(now)},{'\n'}
              <Text style={styles.greetingName}>{(user?.name ?? 'there').split(' ')[0]}</Text>
            </Text>

            <Text style={styles.schoolName} numberOfLines={1}>
              {(school?.name ?? 'Your school').toUpperCase()}
            </Text>

            {/* ─── Signature: the day's ledger ───────────────────────────── */}
            <View style={styles.ledger}>
              <StarMark size={13} color={GOLD} />
              <View style={{ flex: 1 }}>
                <Text style={styles.ledgerDate}>{dateLine.toUpperCase()}</Text>
                <Text style={styles.ledgerLine} numberOfLines={1}>{ledgerLine}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

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

          <Text style={styles.eyebrow}>{t('dashboard.quickActions', 'Everything else')}</Text>
          <View style={styles.grid}>
            {actions.map(a => (
              <TouchableOpacity key={a.key} style={styles.tile} activeOpacity={0.7} onPress={() => router.push(a.route as any)}>
                <View style={[styles.tileIcon, { backgroundColor: moduleColor(a.key) + '14' }]}>
                  <Ionicons name={a.icon} size={19} color={moduleColor(a.key)} />
                </View>
                <Text style={styles.tileLabel} numberOfLines={2}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const TILE = '31%';
const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: spacing.xl, paddingBottom: spacing.xl,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  watermark: { position: 'absolute', right: -54, top: -34 },

  panelTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roleRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill,
    borderWidth: 1, borderColor: GOLD_DIM,
  },
  roleDot: { width: 6, height: 6, borderRadius: 3 },
  roleText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1, color: GOLD_LIGHT, textTransform: 'uppercase' },
  iconBtn: {
    width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: GOLD_DIM,
  },
  avatar: {
    width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: GOLD,
  },
  avatarText: { color: NIGHT, fontSize: 13, fontWeight: '700' },

  // The one serif on the screen, and the only place the brand voice speaks.
  greeting: {
    fontFamily: SERIF, fontSize: 27, lineHeight: 35, color: 'rgba(255,255,255,0.72)',
    marginTop: spacing.xl,
  },
  greetingName: { color: GOLD_LIGHT },

  // Spaced capitals, echoing "QMSOFTS" along the foot of the mark.
  schoolName: {
    fontSize: 10, fontWeight: '600', letterSpacing: 2.2,
    color: 'rgba(255,255,255,0.42)', marginTop: spacing.sm,
  },

  ledger: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginTop: spacing.xl, paddingTop: spacing.lg,
    borderTopWidth: 1, borderTopColor: GOLD_DIM,
  },
  ledgerDate: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, color: GOLD },
  ledgerLine: { fontSize: 14, color: 'rgba(255,255,255,0.88)', marginTop: 3 },

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