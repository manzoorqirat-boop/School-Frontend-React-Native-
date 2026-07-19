import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { API } from '@/lib/api';
import { themeForRole, colors, spacing, font, radius } from '@/theme';
import { GradientHeader, StatTile, Card, Chip } from '@/components/ui';

export default function Superadmin() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const rt = themeForRole('superadmin');
  const [schools, setSchools] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const data = await API.get<any[]>('/api/schools'); setSchools(Array.isArray(data) ? data : []); } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const active = schools.filter(s => s.isActive).length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={rt.accent} />}>
      <GradientHeader colors={rt.gradient} subtitle={rt.label} title="Schools"
        right={<TouchableOpacity onPress={signOut} style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name ?? 'U').slice(0,2).toUpperCase()}</Text>
        </TouchableOpacity>} />
      <View style={styles.statRow}>
        <StatTile label="Total Schools" value={schools.length} icon="business" tint={colors.amber} />
        <StatTile label="Active" value={active} icon="checkmark-circle" tint={colors.emerald} />
      </View>
      <Text style={styles.section}>All schools</Text>
      <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
        {schools.map(s => (
          <Card key={s._id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.schoolName}>{s.name}</Text>
                <Text style={styles.slug}>{s.slug} · {s.type?.toUpperCase?.()}</Text>
              </View>
              <Chip label={s.isActive ? 'Active' : 'Inactive'} tint={s.isActive ? colors.emerald : colors.danger} />
            </View>
          </Card>
        ))}
        {schools.length === 0 && <Text style={styles.empty}>No schools yet. Pull to refresh.</Text>}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  statRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, marginTop: -spacing.lg },
  section: { ...font.h3, color: colors.ink, paddingHorizontal: spacing.xl, marginTop: spacing.xl, marginBottom: spacing.md },
  schoolName: { ...font.title, color: colors.ink },
  slug: { ...font.label, color: colors.muted, marginTop: 2 },
  empty: { ...font.body, color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
});
