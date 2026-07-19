import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { API } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/i18n';
import { colors, spacing, font, radius, themeForRole } from '@/theme';
import { Screen, ListItem, EmptyState, Loading } from '@/components/screen';
import { Ionicons } from '@expo/vector-icons';

export default function MyClasses() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const rt = themeForRole(user?.role);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const data = await API.get('/api/class-teachers/my-classes'); setClasses(data.items ?? []); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  if (loading) return <Screen title={t('nav.myClasses', 'My Classes')} colors={rt.gradient} onBack={() => router.back()}><Loading /></Screen>;

  return (
    <Screen title={t('nav.myClasses', 'My Classes')} subtitle={`${classes.length} assigned`} colors={rt.gradient} onBack={() => router.back()} scroll={false}>
      <FlatList
        data={classes}
        keyExtractor={(c, i) => c._id ?? String(i)}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={rt.accent} />}
        ListEmptyComponent={<EmptyState icon="easel" text="No classes assigned yet." />}
        renderItem={({ item: c }) => (
          <ListItem
            leading={<View style={[styles.badge, { backgroundColor: rt.accent + '18' }]}>
              <Text style={[styles.badgeText, { color: rt.accent }]}>{c.class}-{c.section}</Text>
            </View>}
            title={`Class ${c.class} · Section ${c.section}`}
            subtitle={`${c.subject ?? 'Class teacher'}${c.isPrimary ? ' · Primary' : ''}`}
            onPress={() => router.push('/(app)/attendance')}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { width: 52, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  badgeText: { ...font.title, fontWeight: '800' },
});
