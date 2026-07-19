import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { API } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/i18n';
import { colors, spacing, font, radius, themeForRole } from '@/theme';
import { Screen, ListItem, EmptyState, Loading, FormModal } from '@/components/screen';

const STATUS_TINT: Record<string, string> = {
  paid: colors.emerald, locked: colors.sky, generated: colors.amber, draft: colors.muted,
};
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Payroll() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const rt = themeForRole(user?.role);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<any>(null);

  const load = useCallback(async () => {
    try { const data = await API.get('/api/payroll?limit=200'); setPayslips(data.items ?? []); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  if (loading) return <Screen title={t('nav.payroll', 'Payroll')} colors={rt.gradient} onBack={() => router.back()}><Loading /></Screen>;

  return (
    <Screen title={t('nav.payroll', 'Payroll')} subtitle={`${payslips.length} payslips`} colors={rt.gradient} onBack={() => router.back()} scroll={false}>
      <FlatList
        data={payslips}
        keyExtractor={p => p._id}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={rt.accent} />}
        ListEmptyComponent={<EmptyState icon="cash" text="No payslips generated." />}
        renderItem={({ item: p }) => (
          <ListItem
            title={p.teacherName ?? 'Teacher'}
            subtitle={`${MONTHS[(p.month ?? 1) - 1]} ${p.year} · Net ₹${(p.netSalary ?? 0).toLocaleString('en-IN')}`}
            badge={p.status ?? 'draft'} badgeTint={STATUS_TINT[p.status ?? 'draft']}
            onPress={() => setView(p)}
          />
        )}
      />

      <FormModal
        visible={!!view} title={view ? `${view.teacherName} · ${MONTHS[(view.month ?? 1) - 1]} ${view.year}` : ''}
        onClose={() => setView(null)} onSubmit={() => setView(null)} submitLabel="Close"
      >
        {view && (
          <View style={{ gap: 4 }}>
            <Section title="Earnings" />
            <Row k="Base" v={view.baseSalary} />
            <Row k="DA" v={view.da} /><Row k="HRA" v={view.hra} /><Row k="TA" v={view.ta} />
            <Row k="Other" v={view.otherAllowances} />
            <Row k="Gross" v={view.grossSalary} bold />
            <Section title="Deductions" />
            <Row k="PF" v={view.pf} /><Row k="ESI" v={view.esi} />
            <Row k="Prof. Tax" v={view.professionalTax} /><Row k="Income Tax" v={view.incomeTax} />
            <Row k="Leave" v={view.leaveDeduction} />
            <Row k="Total Deductions" v={view.totalDeductions} bold />
            <View style={styles.netRow}>
              <Text style={styles.netLabel}>Net Pay</Text>
              <Text style={styles.netValue}>₹{(view.netSalary ?? 0).toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}
      </FormModal>
    </Screen>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}
function Row({ k, v, bold }: { k: string; v?: number; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.k, bold && { fontWeight: '800', color: colors.ink }]}>{k}</Text>
      <Text style={[styles.v, bold && { fontWeight: '800' }]}>₹{(v ?? 0).toLocaleString('en-IN')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { ...font.title, color: colors.primary, marginTop: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  k: { ...font.body, color: colors.slate },
  v: { ...font.body, color: colors.ink, fontWeight: '600' },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.emerald + '15', borderRadius: radius.md },
  netLabel: { ...font.h3, color: colors.emerald },
  netValue: { ...font.h2, color: colors.emerald },
});
