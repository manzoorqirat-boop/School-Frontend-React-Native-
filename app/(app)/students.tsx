import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/i18n';
import { can } from '@/lib/privileges';
import { exportCSV } from '@/lib/export';
import { colors, spacing, font, radius, themeForRole } from '@/theme';
import {
  Screen, SearchBar, ListItem, Avatar, EmptyState, Loading, Field, ChipPicker, FormModal,
} from '@/components/screen';

const CLASSES = ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
const SECTIONS = ['A','B','C','D','E'];
const STATUS_TINT: Record<string, string> = { active: colors.emerald, inactive: colors.muted, graduated: colors.sky };

export default function Students() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const rt = themeForRole(user?.role);
  const [all, setAll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [fClass, setFClass] = useState('');
  const [fStatus, setFStatus] = useState('');

  // form
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const data = await API.get('/api/students?limit=2000');
      setAll(data.items ?? []);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const filtered = useMemo(() => {
    let list = all;
    if (fClass) list = list.filter(s => s.class === fClass);
    if (fStatus) list = list.filter(s => (s.status ?? 'active') === fStatus);
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter(s =>
        [s.firstName, s.lastName, s.admissionNo, s.rollNo, s.fatherName, s.phone, s.fatherPhone]
          .filter(Boolean).some((v: string) => String(v).toLowerCase().includes(t)));
    }
    return list;
  }, [all, q, fClass, fStatus]);

  function openCreate() {
    setEditingId(null);
    setForm({ class: '1', section: 'A', gender: 'male', status: 'active' });
    setFormOpen(true);
  }
  function openEdit(s: any) {
    setEditingId(s._id);
    setForm({ ...s });
    setView(null);
    setFormOpen(true);
  }

  async function save() {
    if (!form.firstName || !form.admissionNo) {
      Alert.alert('Missing', 'First name and admission number are required.');
      return;
    }
    setSaving(true);
    try {
      const saved = editingId
        ? await API.put(`/api/students/${editingId}`, form)
        : await API.post('/api/students', form);
      setAll(prev => editingId ? prev.map(x => x._id === editingId ? { ...x, ...saved } : x) : [saved, ...prev]);
      setFormOpen(false);
      if (saved._parent?.created) {
        Alert.alert('Parent account created', `Username: ${saved._parent.username}\nPassword: ${saved._parent.password}`);
      }
    } catch (e: any) { Alert.alert('Save failed', e.message); }
    finally { setSaving(false); }
  }

  async function deactivate(s: any) {
    Alert.alert('Deactivate student', `Set ${s.firstName} inactive?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: async () => {
        try { await API.del(`/api/students/${s._id}`); setAll(prev => prev.map(x => x._id === s._id ? { ...x, status: 'inactive' } : x)); setView(null); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  }

  async function doExport() {
    try {
      await exportCSV('students', ['Name', 'Admission No', 'Class', 'Section', 'Roll', 'Father', 'Phone', 'Status'],
        filtered.map(s => [`${s.firstName} ${s.lastName ?? ''}`.trim(), s.admissionNo, s.class, s.section, s.rollNo, s.fatherName, s.fatherPhone, s.status ?? 'active']));
    } catch (e: any) { Alert.alert('Export failed', e.message); }
  }

  if (loading) return <Screen title={t('nav.students', 'Students')} colors={rt.gradient} onBack={() => router.back()}><Loading /></Screen>;

  return (
    <Screen
      title={t('nav.students', 'Students')} subtitle={`${filtered.length} of ${all.length}`}
      colors={rt.gradient} onBack={() => router.back()} scroll={false}
      right={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={doExport} style={styles.addBtn}>
            <Ionicons name="share-outline" size={22} color="#fff" />
          </TouchableOpacity>
          {can(user, 'student:create') && (
            <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      }
    >
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Name, admission no, phone…" />
        <ChipPicker label="Class" options={['', ...CLASSES]} value={fClass} onChange={setFClass} />
        <View style={{ height: spacing.sm }} />
        <ChipPicker label="Status" options={['', 'active', 'inactive', 'graduated']} value={fStatus} onChange={setFStatus} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={s => s._id}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={rt.accent} />}
        ListEmptyComponent={<EmptyState icon="people" text="No students match." />}
        renderItem={({ item: s }) => (
          <ListItem
            leading={<Avatar name={`${s.firstName} ${s.lastName ?? ''}`} tint={rt.accent} />}
            title={`${s.firstName} ${s.lastName ?? ''}`.trim()}
            subtitle={`${s.class}-${s.section} · Adm ${s.admissionNo}${s.rollNo ? ' · Roll ' + s.rollNo : ''}`}
            badge={(s.status ?? 'active')} badgeTint={STATUS_TINT[s.status ?? 'active']}
            onPress={() => setView(s)}
          />
        )}
      />

      {/* Detail sheet */}
      <FormModal
        visible={!!view} title={view ? `${view.firstName} ${view.lastName ?? ''}`.trim() : ''}
        onClose={() => setView(null)} onSubmit={() => view && openEdit(view)}
        submitLabel={can(user, 'student:update') ? 'Edit' : 'Close'}
      >
        {view && (
          <View style={{ gap: spacing.sm }}>
            <Detail k="Admission No" v={view.admissionNo} />
            <Detail k="Class / Section" v={`${view.class} - ${view.section}`} />
            <Detail k="Roll No" v={view.rollNo} />
            <Detail k="Gender" v={view.gender} />
            <Detail k="Father" v={view.fatherName} />
            <Detail k="Father Phone" v={view.fatherPhone} />
            <Detail k="Mother" v={view.motherName} />
            <Detail k="Status" v={view.status} />
            {can(user, 'student:delete') && (view.status ?? 'active') === 'active' && (
              <TouchableOpacity onPress={() => deactivate(view)} style={styles.dangerBtn}>
                <Ionicons name="ban" size={18} color={colors.danger} />
                <Text style={styles.dangerText}>Deactivate student</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </FormModal>

      {/* Create / edit form */}
      <FormModal
        visible={formOpen} title={editingId ? 'Edit student' : 'New student'}
        onClose={() => setFormOpen(false)} onSubmit={save} submitting={saving}
        submitLabel={editingId ? 'Update' : 'Create'}
      >
        <Field label="First name *" value={form.firstName} onChangeText={(v: string) => setForm({ ...form, firstName: v })} />
        <Field label="Last name" value={form.lastName} onChangeText={(v: string) => setForm({ ...form, lastName: v })} />
        <Field label="Admission No *" value={form.admissionNo} onChangeText={(v: string) => setForm({ ...form, admissionNo: v })} />
        <ChipPicker label="Class" options={CLASSES} value={form.class ?? '1'} onChange={(v) => setForm({ ...form, class: v })} />
        <ChipPicker label="Section" options={SECTIONS} value={form.section ?? 'A'} onChange={(v) => setForm({ ...form, section: v })} />
        <Field label="Roll No" value={form.rollNo} onChangeText={(v: string) => setForm({ ...form, rollNo: v })} />
        <ChipPicker label="Gender" options={['male', 'female', 'other']} value={form.gender ?? 'male'} onChange={(v) => setForm({ ...form, gender: v })} />
        <Field label="Father name" value={form.fatherName} onChangeText={(v: string) => setForm({ ...form, fatherName: v })} />
        <Field label="Father phone" value={form.fatherPhone} keyboardType="phone-pad" onChangeText={(v: string) => setForm({ ...form, fatherPhone: v })} />
        <Field label="Mother name" value={form.motherName} onChangeText={(v: string) => setForm({ ...form, motherName: v })} />
      </FormModal>
    </Screen>
  );
}

function Detail({ k, v }: { k: string; v?: any }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailK}>{k}</Text>
      <Text style={styles.detailV}>{v ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.line },
  detailK: { ...font.label, color: colors.muted },
  detailV: { ...font.body, color: colors.ink, fontWeight: '600' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    paddingVertical: 12, marginTop: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger + '40' },
  dangerText: { ...font.title, color: colors.danger },
});