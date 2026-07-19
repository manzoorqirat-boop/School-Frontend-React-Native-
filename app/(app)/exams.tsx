import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/i18n';
import { can } from '@/lib/privileges';
import { colors, spacing, font, radius, themeForRole } from '@/theme';
import { Screen, ListItem, EmptyState, Loading, FormModal } from '@/components/screen';

const STATUS_TINT: Record<string, string> = {
  published: colors.emerald, completed: colors.sky, scheduled: colors.amber, draft: colors.muted, ongoing: colors.violet,
};

export default function Exams() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const rt = themeForRole(user?.role);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);

  const load = useCallback(async () => {
    try { const data = await API.get('/api/exams'); setExams(data.items ?? []); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  async function openView(exam: any) {
    setView(exam); setResults([]);
    try { const r = await API.get(`/api/exams/${exam._id}/results`); setResults(r.items ?? []); } catch {}
  }

  async function togglePublish(exam: any) {
    const publish = exam.status !== 'published';
    try {
      const updated = await API.post(`/api/exams/${exam._id}/${publish ? 'publish' : 'unpublish'}`);
      setExams(prev => prev.map(x => x._id === exam._id ? updated : x));
      setView(updated);
    } catch (e: any) { Alert.alert('Error', e.message); }
  }

  if (loading) return <Screen title={t('nav.exams', 'Exams')} colors={rt.gradient} onBack={() => router.back()}><Loading /></Screen>;

  return (
    <Screen title={t('nav.exams', 'Exams')} subtitle={`${exams.length} total`} colors={rt.gradient} onBack={() => router.back()} scroll={false}>
      <FlatList
        data={exams}
        keyExtractor={e => e._id}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={rt.accent} />}
        ListEmptyComponent={<EmptyState icon="document-text" text="No exams yet." />}
        renderItem={({ item: e }) => (
          <ListItem
            title={e.name}
            subtitle={`${e.class}${e.section ? '-' + e.section : ''} · ${e.type ?? ''} · ${e.academicYear ?? ''}`}
            badge={e.status ?? 'draft'} badgeTint={STATUS_TINT[e.status ?? 'draft']}
            onPress={() => openView(e)}
          />
        )}
      />

      <FormModal
        visible={!!view} title={view?.name ?? ''}
        onClose={() => setView(null)}
        onSubmit={() => view && can(user, 'exam:publish') ? togglePublish(view) : setView(null)}
        submitLabel={view && can(user, 'exam:publish') ? (view.status === 'published' ? 'Unpublish' : 'Publish') : 'Close'}
      >
        {view && (
          <View style={{ gap: spacing.sm }}>
            <Detail k="Class" v={`${view.class}${view.section ? '-' + view.section : ''}`} />
            <Detail k="Type" v={view.type} />
            <Detail k="Academic Year" v={view.academicYear} />
            <Detail k="Status" v={view.status} />
            <Detail k="Subjects" v={(view.subjects ?? []).length} />
            <Text style={styles.resultsHead}>Results ({results.length})</Text>
            {results.slice(0, 20).map((r, i) => (
              <View key={i} style={styles.resultRow}>
                <Text style={styles.resultName} numberOfLines={1}>{r.subjectName ?? 'Subject'}</Text>
                <Text style={styles.resultMark}>{r.marksObtained ?? '—'}/{r.maxMarks} {r.grade ? `· ${r.grade}` : ''}</Text>
              </View>
            ))}
            {results.length === 0 && <Text style={styles.noResults}>No results entered yet.</Text>}
          </View>
        )}
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
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.line },
  detailK: { ...font.label, color: colors.muted },
  detailV: { ...font.body, color: colors.ink, fontWeight: '600' },
  resultsHead: { ...font.title, color: colors.ink, marginTop: spacing.md },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  resultName: { ...font.body, color: colors.slate, flex: 1 },
  resultMark: { ...font.label, color: colors.ink, fontWeight: '700' },
  noResults: { ...font.body, color: colors.muted },
});
