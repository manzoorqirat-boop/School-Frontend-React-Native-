import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { API } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/i18n';
import { colors, spacing, font, radius, themeForRole } from '@/theme';
import { Screen, EmptyState, Loading } from '@/components/screen';

export default function Audit() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const rt = themeForRole(user?.role);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const data = await API.get('/api/audit-logs?limit=200'); setLogs(data.logs ?? []); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  if (loading) return <Screen title={t('nav.audit', 'Audit Log')} colors={rt.gradient} onBack={() => router.back()}><Loading /></Screen>;

  return (
    <Screen title={t('nav.audit', 'Audit Log')} subtitle={`${logs.length} events`} colors={rt.gradient} onBack={() => router.back()} scroll={false}>
      <FlatList
        data={logs}
        keyExtractor={(l, i) => l._id ?? String(i)}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={rt.accent} />}
        ListEmptyComponent={<EmptyState icon="document-text" text="No audit events." />}
        renderItem={({ item: l }) => (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: rt.accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.action}>{l.action}</Text>
              <Text style={styles.meta}>{l.username ?? 'system'}{l.entity ? ` · ${l.entity}` : ''}</Text>
            </View>
            <Text style={styles.time}>{l.createdAt ? new Date(l.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  action: { ...font.title, color: colors.ink },
  meta: { ...font.label, color: colors.muted, marginTop: 1 },
  time: { ...font.caption, color: colors.muted },
});
