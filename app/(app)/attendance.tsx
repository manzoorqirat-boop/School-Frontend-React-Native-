import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/i18n';
import { colors, spacing, font, radius, themeForRole } from '@/theme';
import { Screen, ChipPicker, Avatar, EmptyState, Loading } from '@/components/screen';
import { GradientButton } from '@/components/ui';

const CLASSES = ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
const SECTIONS = ['A','B','C','D','E'];
const STATUSES = [
  { key: 'present', label: 'P', tint: colors.emerald },
  { key: 'absent',  label: 'A', tint: colors.danger },
  { key: 'late',    label: 'L', tint: colors.amber },
  { key: 'leave',   label: 'Lv', tint: colors.sky },
];

export default function Attendance() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const rt = themeForRole(user?.role);
  const [cls, setCls] = useState('1');
  const [sec, setSec] = useState('A');
  const [roster, setRoster] = useState<any[] | null>(null);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRoster = useCallback(async () => {
    setLoading(true); setRoster(null);
    try {
      const data = await API.get(`/api/attendance/roster?class=${cls}&section=${sec}`);
      const rows = data.roster ?? [];
      setRoster(rows);
      const initial: Record<string, string> = {};
      rows.forEach((r: any) => { initial[r.student._id] = r.attendance?.status ?? 'present'; });
      setMarks(initial);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, [cls, sec]);

  async function save() {
    if (!roster?.length) return;
    setSaving(true);
    try {
      const entries = roster.map(r => ({ studentId: r.student._id, status: marks[r.student._id] ?? 'present' }));
      const res = await API.post('/api/attendance/mark-bulk', { class: cls, section: sec, mode: 'daily', entries });
      Alert.alert('Saved', `${res.created} new · ${res.updated} updated · ${res.unchanged} unchanged`);
    } catch (e: any) { Alert.alert('Save failed', e.message); }
    finally { setSaving(false); }
  }

  function setAll(status: string) {
    if (!roster) return;
    const next: Record<string, string> = {};
    roster.forEach(r => { next[r.student._id] = status; });
    setMarks(next);
  }

  return (
    <Screen title={t('nav.attendance', 'Attendance')} subtitle="Daily marking" colors={rt.gradient} onBack={() => router.back()} scroll={false}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm }}>
        <ChipPicker label="Class" options={CLASSES} value={cls} onChange={setCls} />
        <ChipPicker label="Section" options={SECTIONS} value={sec} onChange={setSec} />
        <GradientButton label="Load Roster" onPress={loadRoster} colors={rt.gradient} />
      </View>

      {loading && <Loading />}

      {roster && (
        <>
          <View style={styles.bulkRow}>
            <Text style={styles.bulkLabel}>Mark all:</Text>
            {STATUSES.map(s => (
              <TouchableOpacity key={s.key} onPress={() => setAll(s.key)} style={[styles.bulkChip, { borderColor: s.tint }]}>
                <Text style={[styles.bulkChipText, { color: s.tint }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FlatList
            data={roster}
            keyExtractor={r => r.student._id}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
            ListEmptyComponent={<EmptyState icon="people" text="No students in this class." />}
            renderItem={({ item: r }) => (
              <View style={[styles.row]}>
                <Avatar name={`${r.student.firstName} ${r.student.lastName ?? ''}`} tint={rt.accent} size={38} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{r.student.firstName} {r.student.lastName ?? ''}</Text>
                  <Text style={styles.roll}>Roll {r.student.rollNo ?? '—'}</Text>
                </View>
                <View style={styles.statusRow}>
                  {STATUSES.map(s => {
                    const on = marks[r.student._id] === s.key;
                    return (
                      <TouchableOpacity key={s.key} onPress={() => setMarks({ ...marks, [r.student._id]: s.key })}
                        style={[styles.sBtn, on && { backgroundColor: s.tint }]}>
                        <Text style={[styles.sBtnText, on && { color: '#fff' }]}>{s.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          />
          <View style={styles.saveBar}>
            <GradientButton label="Save Attendance" onPress={save} loading={saving} colors={rt.gradient} />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bulkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  bulkLabel: { ...font.label, color: colors.slate },
  bulkChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1.5 },
  bulkChipText: { ...font.caption },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  name: { ...font.title, color: colors.ink },
  roll: { ...font.label, color: colors.muted },
  statusRow: { flexDirection: 'row', gap: 4 },
  sBtn: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center' },
  sBtnText: { ...font.label, color: colors.slate, fontWeight: '800' },
  saveBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: colors.bg },
});
