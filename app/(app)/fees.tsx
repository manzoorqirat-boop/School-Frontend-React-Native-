import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { API } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/i18n';
import { can } from '@/lib/privileges';
import { colors, spacing, font, radius, themeForRole } from '@/theme';
import { Screen, SearchBar, ListItem, EmptyState, Loading, Field, ChipPicker, FormModal } from '@/components/screen';

const STATUS_TINT: Record<string, string> = {
  paid: colors.emerald, partial: colors.amber, pending: colors.sky, overdue: colors.danger, cancelled: colors.muted,
};

export default function Fees() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const rt = themeForRole(user?.role);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');

  const [pay, setPay] = useState<any>(null);
  const [payForm, setPayForm] = useState<any>({ method: 'cash' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const data = await API.get('/api/invoices?limit=500'); setInvoices(data.items ?? []); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const filtered = useMemo(() => {
    let list = invoices;
    if (fStatus) list = list.filter(i => (i.status ?? 'pending') === fStatus);
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter(i => [i.studentName, i.invoiceNo, i.studentAdmNo].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(t)));
    }
    return list;
  }, [invoices, q, fStatus]);

  function openPay(inv: any) {
    const balance = (inv.total ?? 0) - (inv.amountPaid ?? 0);
    setPay(inv);
    setPayForm({ method: 'cash', amount: String(balance) });
  }

  async function collect() {
    const amt = parseFloat(payForm.amount);
    if (!amt || amt <= 0) { Alert.alert('Invalid', 'Enter a valid amount.'); return; }
    setSaving(true);
    try {
      const res = await API.post(`/api/invoices/${pay._id}/pay-offline`, {
        amount: amt, method: payForm.method,
        chequeNo: payForm.chequeNo, chequeBank: payForm.chequeBank,
        transactionRef: payForm.transactionRef,
      });
      setInvoices(prev => prev.map(x => x._id === pay._id ? res.invoice : x));
      setPay(null);
      Alert.alert('Payment recorded', `Receipt ${res.payment?.receiptNo ?? ''}`);
    } catch (e: any) { Alert.alert('Payment failed', e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <Screen title={t('nav.fees', 'Fees')} colors={rt.gradient} onBack={() => router.back()}><Loading /></Screen>;

  const totalDue = filtered.reduce((a, i) => a + Math.max(0, (i.total ?? 0) - (i.amountPaid ?? 0)), 0);

  return (
    <Screen title={t('nav.fees', 'Fees')} subtitle={`₹${totalDue.toLocaleString('en-IN')} outstanding`} colors={rt.gradient} onBack={() => router.back()} scroll={false}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Student, invoice no…" />
        <ChipPicker label="Status" options={['', 'pending', 'partial', 'paid', 'overdue']} value={fStatus} onChange={setFStatus} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i._id}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={rt.accent} />}
        ListEmptyComponent={<EmptyState icon="wallet" text="No invoices match." />}
        renderItem={({ item: i }) => {
          const bal = (i.total ?? 0) - (i.amountPaid ?? 0);
          return (
            <ListItem
              title={i.studentName ?? i.invoiceNo}
              subtitle={`${i.invoiceNo} · ₹${(i.total ?? 0).toLocaleString('en-IN')}${bal > 0 ? ` · ₹${bal.toLocaleString('en-IN')} due` : ''}`}
              badge={i.status ?? 'pending'} badgeTint={STATUS_TINT[i.status ?? 'pending']}
              onPress={can(user, 'fee:collect') && bal > 0 ? () => openPay(i) : undefined}
            />
          );
        }}
      />

      <FormModal
        visible={!!pay} title={`Collect · ${pay?.studentName ?? ''}`}
        onClose={() => setPay(null)} onSubmit={collect} submitting={saving} submitLabel="Record Payment"
      >
        {pay && (
          <>
            <Text style={styles.bal}>Balance: ₹{((pay.total ?? 0) - (pay.amountPaid ?? 0)).toLocaleString('en-IN')}</Text>
            <Field label="Amount *" value={payForm.amount} keyboardType="numeric" onChangeText={(v: string) => setPayForm({ ...payForm, amount: v })} />
            <ChipPicker label="Method" options={['cash', 'cheque', 'upi', 'card', 'bank_transfer']} value={payForm.method} onChange={(v) => setPayForm({ ...payForm, method: v })} />
            {payForm.method === 'cheque' && (
              <>
                <Field label="Cheque No *" value={payForm.chequeNo} onChangeText={(v: string) => setPayForm({ ...payForm, chequeNo: v })} />
                <Field label="Bank *" value={payForm.chequeBank} onChangeText={(v: string) => setPayForm({ ...payForm, chequeBank: v })} />
              </>
            )}
            {['upi', 'card', 'bank_transfer'].includes(payForm.method) && (
              <Field label="Transaction Ref *" value={payForm.transactionRef} onChangeText={(v: string) => setPayForm({ ...payForm, transactionRef: v })} />
            )}
          </>
        )}
      </FormModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bal: { ...font.h3, color: colors.emerald },
});
