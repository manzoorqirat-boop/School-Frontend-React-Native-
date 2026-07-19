import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { API } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/i18n';
import { colors, spacing, font, radius, themeForRole } from '@/theme';
import { Screen, ChipPicker, EmptyState, Loading } from '@/components/screen';
import { Card } from '@/components/ui';
import { GradientButton } from '@/components/ui';

const CLASSES = ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
const SECTIONS = ['A','B','C','D','E'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_NUM: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export default function Timetable() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const rt = themeForRole(user?.role);
  const [cls, setCls] = useState('1');
  const [sec, setSec] = useState('A');
  const [day, setDay] = useState('Mon');
  const [entries, setEntries] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setEntries(null);
    try {
      const data = await API.get(`/api/timetables?class=${cls}&section=${sec}`);
      const tt = (data.items ?? [])[0];
      setEntries(tt?.entries ?? []);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, [cls, sec]);

  const dayEntries = (entries ?? [])
    .filter(e => e.dayOfWeek === DAY_NUM[day])
    .sort((a, b) => (a.slotNumber ?? 0) - (b.slotNumber ?? 0));

  return (
    <Screen title={t('nav.timetable', 'Timetable')} subtitle="Class schedule" colors={rt.gradient} onBack={() => router.back()} scroll={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
        <ChipPicker label="Class" options={CLASSES} value={cls} onChange={setCls} />
        <ChipPicker label="Section" options={SECTIONS} value={sec} onChange={setSec} />
        <GradientButton label="Load" onPress={load} colors={rt.gradient} />

        {entries !== null && (
          <>
            <View style={{ height: spacing.sm }} />
            <ChipPicker label="Day" options={DAYS} value={day} onChange={setDay} />
            <View style={{ height: spacing.sm }} />
            {loading && <Loading />}
            {dayEntries.length === 0
              ? <EmptyState icon="calendar" text={`No periods on ${day}.`} />
              : dayEntries.map((e, i) => (
                <Card key={i} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <View style={[styles.slot, { backgroundColor: rt.accent + '18' }]}>
                      <Text style={[styles.slotNum, { color: rt.accent }]}>{e.slotNumber ?? i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subject}>{e.subject ?? e.subjectName ?? 'Period'}</Text>
                      <Text style={styles.teacher}>{e.teacherName ?? 'Unassigned'}{e.room ? ` · Room ${e.room}` : ''}</Text>
                    </View>
                    {(e.startTime || e.endTime) && (
                      <Text style={styles.time}>{e.startTime}{e.endTime ? `–${e.endTime}` : ''}</Text>
                    )}
                  </View>
                </Card>
              ))
            }
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  slot: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  slotNum: { ...font.h3 },
  subject: { ...font.title, color: colors.ink },
  teacher: { ...font.label, color: colors.muted, marginTop: 1 },
  time: { ...font.label, color: colors.slate },
});
