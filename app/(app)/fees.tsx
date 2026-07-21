import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/privileges';
import { useI18n } from '@/i18n';
import { exportCSV } from '@/lib/export';
import { colors, spacing, font, radius, themeForRole } from '@/theme';
import { Screen, SearchBar, ListItem, EmptyState, Loading, Field, ChipPicker, FormModal } from '@/components/screen';

const STATUS_TINT: Record<string, string> = { pending: colors.warning, partial: colors.info, paid: colors.success, overdue: colors.danger, cancelled: colors.muted };
const newIdemKey = () => `mob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

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

  // detail / pay / discount / generate modal state
  const [detail, setDetail] = useState<any>(null);
  const [detailFull, setDetailFull] = useState<any>(null);
  const [pay, setPay] = useState<any>(null);
  const [payForm, setPayForm] = useState<any>({ method: 'cash' });
  const [idemKey, setIdemKey] = useState('');
  const [disc, setDisc] = useState<any>(null);
  const [discForm, setDiscForm] = useState<any>({});
  const [genOpen, setGenOpen] = useState(false);
  const [structures, setStructures] = useState<any[]>([]);
  const [genForm, setGenForm] = useState<any>({});
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
      const tt = q.toLowerCase();
      list = list.filter(i => [i.studentName, i.invoiceNo, i.studentAdmNo, i.studentClass]
        .filter(Boolean).some((v: string) => String(v).toLowerCase().includes(tt)));
    }
    return list;
  }, [invoices, q, fStatus]);

  // ── Detail ──────────────────────────────────────────────────────────────
  async function openDetail(inv: any) {
    setDetail(inv); setDetailFull(null);
    try { setDetailFull(await API.get(`/api/invoices/${inv._id}`)); } catch { setDetailFull(inv); }
  }

  // ── Pay (idempotent) ────────────────────────────────────────────────────
  function openPay(inv: any) {
    const balance = (inv.total ?? 0) - (inv.amountPaid ?? 0);
    setDetail(null);
    setPay(inv);
    setIdemKey(newIdemKey());               // one key per modal open = retry-safe
    setPayForm({ method: 'cash', amount: String(balance) });
  }

  async function collect() {
    const amt = parseFloat(payForm.amount);
    const bal = (pay.total ?? 0) - (pay.amountPaid ?? 0);
    if (!amt || amt <= 0) { Alert.alert('Invalid', 'Enter a valid amount.'); return; }
    if (payForm.method === 'cheque' && (!payForm.chequeNo?.trim() || !payForm.chequeBank?.trim())) {
      Alert.alert('Missing', 'Cheque number and bank are required for cheque payments.'); return;
    }
    if (['upi', 'card', 'bank_transfer'].includes(payForm.method) && !payForm.transactionRef?.trim()) {
      Alert.alert('Missing', 'Transaction reference is required for this method.'); return;
    }
    const proceed = async () => {
      setSaving(true);
      try {
        const res = await API.post(`/api/invoices/${pay._id}/pay-offline`, {
          amount: amt, method: payForm.method,
          chequeNo: payForm.chequeNo, chequeBank: payForm.chequeBank,
          transactionRef: payForm.transactionRef, notes: payForm.notes,
          idempotencyKey: idemKey,
        });
        setInvoices(prev => prev.map(x => x._id === pay._id ? (res.invoice ?? x) : x));
        setPay(null);
        Alert.alert('Payment recorded', `Receipt ${res.payment?.receiptNo ?? ''}`);
      } catch (e: any) { Alert.alert('Payment failed', e.message); }
      finally { setSaving(false); }
    };
    if (amt > bal) {
      Alert.alert('Overpayment', `Amount exceeds balance of ₹${bal.toLocaleString('en-IN')}. Record anyway?`, [
        { text: 'Cancel', style: 'cancel' }, { text: 'Record', onPress: proceed },
      ]);
    } else await proceed();
  }

  // ── Discount ────────────────────────────────────────────────────────────
  function openDiscount(inv: any) { setDetail(null); setDisc(inv); setDiscForm({ discount: String(inv.discount ?? ''), reason: inv.discountReason ?? '' }); }
  async function applyDiscount() {
    const d = parseFloat(discForm.discount);
    if (isNaN(d) || d < 0) { Alert.alert('Invalid', 'Enter a valid discount amount (0 or more).'); return; }
    if (d > (disc.subtotal ?? 0)) { Alert.alert('Invalid', 'Discount cannot exceed the subtotal.'); return; }
    setSaving(true);
    try {
      const updated = await API.post(`/api/invoices/${disc._id}/discount`, { discount: d, reason: discForm.reason });
      setInvoices(prev => prev.map(x => x._id === disc._id ? updated : x));
      setDisc(null);
    } catch (e: any) { Alert.alert('Failed', e.message); }
    finally { setSaving(false); }
  }

  // ── Generate invoices ───────────────────────────────────────────────────
  async function openGenerate() {
    setGenOpen(true); setGenForm({});
    try { const data = await API.get('/api/fee-structures'); setStructures(Array.isArray(data) ? data : data.items ?? []); }
    catch (e: any) { Alert.alert('Error', e.message); }
  }
  async function generate() {
    if (!genForm.structureId) { Alert.alert('Missing', 'Select a fee structure.'); return; }
    setSaving(true);
    try {
      const res = await API.post('/api/invoices/generate', {
        feeStructureId: genForm.structureId,
        installmentName: genForm.installment || undefined,
      });
      setGenOpen(false);
      Alert.alert('Invoices generated', `Created ${res.created ?? 0}, skipped ${res.skipped ?? 0} (already existed).`);
      load();
    } catch (e: any) { Alert.alert('Failed', e.message); }
    finally { setSaving(false); }
  }

  async function doExport() {
    try {
      await exportCSV('fees', ['Invoice', 'Student', 'Class', 'Total', 'Paid', 'Due', 'Status'],
        filtered.map(i => [i.invoiceNo, i.studentName, `${i.studentClass ?? ''}-${i.studentSection ?? ''}`, i.total ?? 0, i.amountPaid ?? 0, (i.total ?? 0) - (i.amountPaid ?? 0), i.status ?? 'pending']));
    } catch (e: any) { Alert.alert('Export failed', e.message); }
  }

  if (loading) return <Screen title={t('nav.fees', 'Fees')} colors={rt.gradient} onBack={() => router.back()}><Loading /></Screen>;

  const totalDue = filtered.reduce((a, i) => a + Math.max(0, (i.total ?? 0) - (i.amountPaid ?? 0)), 0);
  const selStructure = structures.find(s => s._id === genForm.structureId);

  return (
    <Screen title={t('nav.fees', 'Fees')} subtitle={`₹${totalDue.toLocaleString('en-IN')} outstanding`} colors={rt.gradient} onBack={() => router.back()} scroll={false}
      right={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={doExport} style={styles.hBtn}><Ionicons name="share-outline" size={20} color={colors.ink} /></TouchableOpacity>
          {can(user, 'fee:create') && (
            <TouchableOpacity onPress={openGenerate} style={styles.hBtn}><Ionicons name="add" size={22} color={colors.ink} /></TouchableOpacity>
          )}
        </View>
      }>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Student, invoice no, class…" />
        <ChipPicker label="Status" options={['', 'pending', 'partial', 'paid', 'overdue']} value={fStatus} onChange={setFStatus} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i._id}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={rt.accent} />}
        ListEmptyComponent={<EmptyState icon="wallet" text="No invoices. Use + to generate from a fee structure." />}
        renderItem={({ item: i }) => {
          const bal = (i.total ?? 0) - (i.amountPaid ?? 0);
          return (
            <ListItem
              title={i.studentName ?? i.invoiceNo}
              subtitle={`${i.invoiceNo} · ₹${(i.total ?? 0).toLocaleString('en-IN')}${bal > 0 ? ` · ₹${bal.toLocaleString('en-IN')} due` : ''}`}
              badge={i.status ?? 'pending'} badgeTint={STATUS_TINT[i.status ?? 'pending']}
              onPress={() => openDetail(i)}
            />
          );
        }}
      />

      {/* ── Invoice detail ── */}
      <FormModal visible={!!detail} title={detail?.invoiceNo ?? ''} onClose={() => setDetail(null)}
        onSubmit={() => setDetail(null)} submitLabel="Close">
        {detail && (
          <View style={{ gap: 6 }}>
            <Row k="Student" v={`${detail.studentName ?? ''} (${detail.studentClass ?? ''}-${detail.studentSection ?? ''})`} />
            <Row k="Academic year" v={detail.academicYear} />
            {(detailFull?.lines ?? []).map((l: any, idx: number) => (
              <Row key={idx} k={l.headName ?? l.name ?? `Line ${idx + 1}`} v={`₹${(l.amount ?? 0).toLocaleString('en-IN')}`} />
            ))}
            <Row k="Subtotal" v={`₹${(detail.subtotal ?? detail.total ?? 0).toLocaleString('en-IN')}`} />
            {(detail.discount ?? 0) > 0 && <Row k={`Discount${detail.discountReason ? ` (${detail.discountReason})` : ''}`} v={`−₹${detail.discount.toLocaleString('en-IN')}`} />}
            {(detail.lateFee ?? 0) > 0 && <Row k="Late fee" v={`₹${detail.lateFee.toLocaleString('en-IN')}`} />}
            <Row k="Total" v={`₹${(detail.total ?? 0).toLocaleString('en-IN')}`} strong />
            <Row k="Paid" v={`₹${(detail.amountPaid ?? 0).toLocaleString('en-IN')}`} />
            <Row k="Balance" v={`₹${Math.max(0, (detail.total ?? 0) - (detail.amountPaid ?? 0)).toLocaleString('en-IN')}`} strong />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              {can(user, 'fee:collect') && ((detail.total ?? 0) - (detail.amountPaid ?? 0)) > 0 && (
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.primary }]} onPress={() => openPay(detail)}>
                  <Ionicons name="cash-outline" size={16} color="#fff" /><Text style={styles.actText}>Collect</Text>
                </TouchableOpacity>
              )}
              {can(user, 'fee:create') && (detail.status !== 'paid') && (
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.surfaceAlt }]} onPress={() => openDiscount(detail)}>
                  <Ionicons name="pricetag-outline" size={16} color={colors.ink} /><Text style={[styles.actText, { color: colors.ink }]}>Discount</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </FormModal>

      {/* ── Collect payment ── */}
      <FormModal visible={!!pay} title={`Collect · ${pay?.studentName ?? ''}`}
        onClose={() => setPay(null)} onSubmit={collect} submitting={saving} submitLabel="Record Payment">
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
            <Field label="Notes" value={payForm.notes} onChangeText={(v: string) => setPayForm({ ...payForm, notes: v })} />
          </>
        )}
      </FormModal>

      {/* ── Discount ── */}
      <FormModal visible={!!disc} title={`Discount · ${disc?.invoiceNo ?? ''}`}
        onClose={() => setDisc(null)} onSubmit={applyDiscount} submitting={saving} submitLabel="Apply">
        {disc && (
          <>
            <Text style={styles.balMuted}>Subtotal: ₹{(disc.subtotal ?? 0).toLocaleString('en-IN')}</Text>
            <Field label="Discount amount *" value={discForm.discount} keyboardType="numeric" onChangeText={(v: string) => setDiscForm({ ...discForm, discount: v })} />
            <Field label="Reason" value={discForm.reason} onChangeText={(v: string) => setDiscForm({ ...discForm, reason: v })} />
          </>
        )}
      </FormModal>

      {/* ── Generate invoices ── */}
      <FormModal visible={genOpen} title="Generate invoices" onClose={() => setGenOpen(false)}
        onSubmit={generate} submitting={saving} submitLabel="Generate">
        <Text style={styles.balMuted}>Creates one invoice per active student in the structure's class. Already-generated invoices are skipped.</Text>
        <ChipPicker label="Fee structure *" options={structures.map(s => s.name)} value={selStructure?.name ?? ''}
          onChange={(name) => { const s = structures.find(x => x.name === name); setGenForm({ structureId: s?._id, installment: '' }); }} />
        {selStructure && (selStructure.installments ?? []).length > 0 && (
          <ChipPicker label="Installment (blank = full year)" options={['', ...(selStructure.installments ?? []).map((i: any) => i.name)]}
            value={genForm.installment ?? ''} onChange={(v) => setGenForm({ ...genForm, installment: v })} />
        )}
      </FormModal>
    </Screen>
  );
}

function Row({ k, v, strong }: { k: string; v?: any; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowK}>{k}</Text>
      <Text style={[styles.rowV, strong && { fontWeight: '700' }]}>{v ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  bal: { ...font.h3, color: colors.success },
  balMuted: { ...font.label, color: colors.slate },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 },
  rowK: { ...font.label, color: colors.muted, flexShrink: 1 },
  rowV: { ...font.body, color: colors.ink, fontWeight: '500' },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: radius.md },
  actText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});