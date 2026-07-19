import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/i18n';
import { can } from '@/lib/privileges';
import { colors, spacing, font, radius, themeForRole, roleTheme } from '@/theme';
import { Screen, SearchBar, ListItem, Avatar, EmptyState, Loading, Field, ChipPicker, FormModal } from '@/components/screen';

const ROLES = ['school_admin', 'principal', 'accountant', 'teacher', 'parent', 'student'];

export default function Users() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const rt = themeForRole(user?.role);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [fRole, setFRole] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<any>(null);

  const load = useCallback(async () => {
    try { const data = await API.get('/api/users?limit=500'); setUsers(data.items ?? []); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const filtered = useMemo(() => {
    let list = users;
    if (fRole) list = list.filter(u => u.role === fRole);
    if (q.trim()) { const t = q.toLowerCase(); list = list.filter(u => [u.name, u.username].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(t))); }
    return list;
  }, [users, q, fRole]);

  function openCreate() { setForm({ role: 'teacher' }); setFormOpen(true); }

  async function save() {
    if (!form.username || !form.password || !form.name) { Alert.alert('Missing', 'Name, username and password are required.'); return; }
    setSaving(true);
    try {
      const created = await API.post('/api/users', form);
      setUsers(prev => [created, ...prev]);
      setFormOpen(false);
    } catch (e: any) { Alert.alert('Create failed', e.message); }
    finally { setSaving(false); }
  }

  async function resetPassword(u: any) {
    Alert.prompt?.('Reset password', `New password for ${u.username}`, async (pw?: string) => {
      if (!pw) return;
      try { await API.post(`/api/users/${u._id}/reset-password`, { newPassword: pw }); Alert.alert('Done', 'Password reset.'); }
      catch (e: any) { Alert.alert('Failed', e.message); }
    });
  }

  async function deactivate(u: any) {
    Alert.alert('Deactivate', `Disable ${u.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: async () => {
        try { await API.del(`/api/users/${u._id}`); setUsers(prev => prev.map(x => x._id === u._id ? { ...x, isActive: false } : x)); setView(null); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  }

  if (loading) return <Screen title={t('nav.users', 'Users')} colors={rt.gradient} onBack={() => router.back()}><Loading /></Screen>;

  return (
    <Screen title={t('nav.users', 'Users')} subtitle={`${filtered.length} accounts`} colors={rt.gradient} onBack={() => router.back()} scroll={false}
      right={can(user, 'user:manage') ? <TouchableOpacity onPress={openCreate} style={styles.addBtn}><Ionicons name="add" size={24} color="#fff" /></TouchableOpacity> : undefined}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Name or username…" />
        <ChipPicker label="Role" options={['', ...ROLES]} value={fRole} onChange={setFRole} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={u => u._id}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={rt.accent} />}
        ListEmptyComponent={<EmptyState icon="people" text="No users match." />}
        renderItem={({ item: u }) => {
          const tint = roleTheme[u.role]?.accent ?? colors.primary;
          return (
            <ListItem
              leading={<Avatar name={u.name} tint={tint} />}
              title={u.name}
              subtitle={`@${u.username} · ${roleTheme[u.role]?.label ?? u.role}`}
              badge={u.isActive === false ? 'inactive' : 'active'}
              badgeTint={u.isActive === false ? colors.muted : colors.emerald}
              onPress={() => setView(u)}
            />
          );
        }}
      />

      <FormModal visible={!!view} title={view?.name ?? ''} onClose={() => setView(null)}
        onSubmit={() => setView(null)} submitLabel="Close">
        {view && (
          <View style={{ gap: spacing.sm }}>
            <Detail k="Username" v={`@${view.username}`} />
            <Detail k="Role" v={roleTheme[view.role]?.label ?? view.role} />
            <Detail k="Email" v={view.email} />
            <Detail k="Phone" v={view.phone} />
            <Detail k="Status" v={view.isActive === false ? 'Inactive' : 'Active'} />
            {can(user, 'user:manage') && (
              <>
                <TouchableOpacity onPress={() => resetPassword(view)} style={styles.actionBtn}>
                  <Ionicons name="key" size={18} color={colors.primary} />
                  <Text style={styles.actionText}>Reset password</Text>
                </TouchableOpacity>
                {view.isActive !== false && (
                  <TouchableOpacity onPress={() => deactivate(view)} style={[styles.actionBtn, { borderColor: colors.danger + '40' }]}>
                    <Ionicons name="ban" size={18} color={colors.danger} />
                    <Text style={[styles.actionText, { color: colors.danger }]}>Deactivate</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      </FormModal>

      <FormModal visible={formOpen} title="New user" onClose={() => setFormOpen(false)}
        onSubmit={save} submitting={saving} submitLabel="Create">
        <Field label="Full name *" value={form.name} onChangeText={(v: string) => setForm({ ...form, name: v })} />
        <Field label="Username *" value={form.username} autoCapitalize="none" onChangeText={(v: string) => setForm({ ...form, username: v })} />
        <Field label="Password *" value={form.password} secureTextEntry onChangeText={(v: string) => setForm({ ...form, password: v })} />
        <ChipPicker label="Role" options={ROLES} value={form.role ?? 'teacher'} onChange={(v) => setForm({ ...form, role: v })} />
        <Field label="Email" value={form.email} autoCapitalize="none" onChangeText={(v: string) => setForm({ ...form, email: v })} />
        <Field label="Phone" value={form.phone} keyboardType="phone-pad" onChangeText={(v: string) => setForm({ ...form, phone: v })} />
      </FormModal>
    </Screen>
  );
}

function Detail({ k, v }: { k: string; v?: any }) {
  return <View style={styles.detailRow}><Text style={styles.detailK}>{k}</Text><Text style={styles.detailV}>{v ?? '—'}</Text></View>;
}

const styles = StyleSheet.create({
  addBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  detailK: { ...font.label, color: colors.muted },
  detailV: { ...font.body, color: colors.ink, fontWeight: '600' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 12,
    marginTop: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary + '40' },
  actionText: { ...font.title, color: colors.primary },
});
