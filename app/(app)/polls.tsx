import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/i18n';
import { colors, spacing, font, radius, themeForRole } from '@/theme';
import { Screen, EmptyState, Loading, FormModal } from '@/components/screen';
import { Chip } from '@/components/ui';
import { GradientButton } from '@/components/ui';

export default function Polls() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const rt = themeForRole(user?.role);
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [active, setActive] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<any | null>(null);
  const [voting, setVoting] = useState(false);

  const load = useCallback(async () => {
    try { const data = await API.get<any[]>('/api/polls'); setPolls(Array.isArray(data) ? data : []); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  function openPoll(p: any) { setActive(p); setAnswers({}); setResults(null); }

  async function vote() {
    if (!active) return;
    const qs = active.questions ?? [];
    const payload = qs.map((q: any) => ({ questionId: q._id, optionId: answers[q._id] })).filter((a: any) => a.optionId);
    if (payload.length !== qs.length) { Alert.alert('Incomplete', 'Please answer all questions.'); return; }
    setVoting(true);
    try {
      await API.post(`/api/polls/${active._id}/vote`, { answers: payload });
      Alert.alert('Thanks!', 'Your vote was recorded.');
      await loadResults(active);
    } catch (e: any) {
      if (e.status === 409) { Alert.alert('Already voted', 'You have already voted in this poll.'); await loadResults(active); }
      else Alert.alert('Vote failed', e.message);
    } finally { setVoting(false); }
  }

  async function loadResults(p: any) {
    try { const r = await API.get(`/api/polls/${p._id}/results`); setResults(r); } catch {}
  }

  if (loading) return <Screen title={t('nav.polls', 'Polls')} colors={rt.gradient} onBack={() => router.back()}><Loading /></Screen>;

  return (
    <Screen title={t('nav.polls', 'Polls')} subtitle={`${polls.length} active`} colors={rt.gradient} onBack={() => router.back()} scroll={false}>
      <FlatList
        data={polls}
        keyExtractor={p => p._id}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={rt.accent} />}
        ListEmptyComponent={<EmptyState icon="bar-chart" text="No polls right now." />}
        renderItem={({ item: p }) => (
          <TouchableOpacity activeOpacity={0.85} onPress={() => openPoll(p)} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{p.title}</Text>
              {p.description ? <Text style={styles.desc} numberOfLines={2}>{p.description}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                <Chip label={`${(p.questions ?? []).length} question${(p.questions ?? []).length === 1 ? '' : 's'}`} tint={rt.accent} />
                {p.status ? <Chip label={p.status} tint={colors.emerald} /> : null}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>
        )}
      />

      <FormModal
        visible={!!active} title={active?.title ?? ''} onClose={() => setActive(null)}
        onSubmit={results ? () => setActive(null) : vote}
        submitting={voting} submitLabel={results ? 'Done' : 'Submit Vote'}
      >
        {active && !results && (active.questions ?? []).map((q: any) => (
          <View key={q._id} style={{ gap: 8, marginBottom: spacing.md }}>
            <Text style={styles.q}>{q.text ?? q.question}</Text>
            {(q.options ?? []).map((o: any) => {
              const on = answers[q._id] === o._id;
              return (
                <TouchableOpacity key={o._id} onPress={() => setAnswers({ ...answers, [q._id]: o._id })}
                  style={[styles.opt, on && { borderColor: rt.accent, backgroundColor: rt.accent + '12' }]}>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? rt.accent : colors.muted} />
                  <Text style={styles.optText}>{o.text ?? o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        {results && (
          <View style={{ gap: 8 }}>
            <Text style={styles.resultsHead}>Total votes: {results.totalVotes ?? 0}</Text>
            {(results.tallies ?? []).map((t: any, i: number) => (
              <View key={i} style={styles.tallyRow}>
                <Text style={styles.tallyText}>Option {t.optionId?.slice(-4) ?? i}</Text>
                <Text style={styles.tallyCount}>{t.count}</Text>
              </View>
            ))}
          </View>
        )}
      </FormModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card,
    borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm },
  title: { ...font.title, color: colors.ink },
  desc: { ...font.label, color: colors.muted, marginTop: 2 },
  q: { ...font.title, color: colors.ink },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card },
  optText: { ...font.body, color: colors.ink, flex: 1 },
  resultsHead: { ...font.title, color: colors.ink },
  tallyRow: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.md },
  tallyText: { ...font.body, color: colors.slate },
  tallyCount: { ...font.title, color: colors.primary },
});
