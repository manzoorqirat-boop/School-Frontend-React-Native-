import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/privileges';
import { useI18n } from '@/i18n';
import { colors, spacing, font, radius, themeForRole } from '@/theme';
import { Screen, ChipPicker, EmptyState, Loading, Field, FormModal } from '@/components/screen';
import { GradientButton, Card } from '@/components/ui';

const CLASSES = ['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
const SECTIONS = ['A','B','C','D','E'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_NUM: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

type Entry = { dayOfWeek: number; slotNumber: number; subject: string; teacherName?: string; room?: string; startTime?: string; endTime?: string };

export default function Timetable() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const rt = themeForRole(user?.role);
  const editable = can(user, 'timetable:manage');

  const [cls, setCls] = useState('1');
  const [sec, setSec] = useState('A');
  const [day, setDay] = useState('Mon');
  const [ttId, setTtId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [entryForm, setEntryForm] = useState<any>({});

  const load = useCallback(async () => {
    setLoading(true); setEntries(null);
    try {
      const data = await API.get(`/api/timetables?class=${cls}&section=${sec}`);
      const tt = (data.items ?? [])[0];
      setTtId(tt?._id ?? null);
      setEntries(tt?.entries ?? []);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, [cls, sec]);

  const dayEntries = (entries ?? [])
    .filter(e => e.dayOfWeek === DAY_NUM[day])
    .sort((a, b) => (a.slotNumber ?? 0) - (b.slotNumber ?? 0));

  function openAdd() {
    const nextSlot = (dayEntries.at(-1)?.slotNumber ?? 0) + 1;
    setEntryForm({ slotNumber: String(nextSlot), subject: '', teacherName: '', room: '', startTime: '', endTime: '' });
    setFormOpen(true);
  }

  function addEntry() {
    if (!entryForm.subject?.trim()) { Alert.alert('Missing', 'Subject is required.'); return; }
    const e: Entry = {
      dayOfWeek: DAY_NUM[day], slotNumber: parseInt(entryForm.slotNumber) || (dayEntries.length + 1),
      subject: entryForm.subject.trim(), teacherName: entryForm.teacherName?.trim() || undefined,
      room: entryForm.room?.trim() || undefined, startTime: entryForm.startTime?.trim() || undefined,
      endTime: entryForm.endTime?.trim() || undefined,
    };
    setEntries([...(entries ?? []), e]);
    setFormOpen(false);
  }

  function removeEntry(target: Entry) {
    setEntries((entries ?? []).filter(e => !(e.dayOfWeek === target.dayOfWeek && e.slotNumber === target.slotNumber)));
  }

  async function saveAll() {
    if (!ttId) { Alert.alert('No timetable', 'No timetable exists for this class/section yet. Create one from the web admin first.'); return; }
    setSaving(true);
    try {
      await API.post(`/api/timetables/${ttId}/entries`, { entries });
      Alert.alert('Saved', 'Timetable updated.');
    } catch (e: any) { Alert.alert('Save failed', e.message); }
    finally { setSaving(false); }
  }

  return (
    <Screen title={t('nav.timetable', 'Timetable')} subtitle={editable ? 'View & edit' : 'Class schedule'}
      colors={rt.gradient} onBack={() => router.back()} scroll={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: 100 }}>
        <ChipPicker label="Class" options={CLASSES} value={cls} onChange={setCls} />
        <ChipPicker label="Section" options={SECTIONS} value={sec} onChange={setSec} />
        <GradientButton label="Load" onPress={load} colors={rt.gradient} />

        {loading && <Loading />}

        {entries !== null && (
          <>
            <View style={{ height: spacing.sm }} />
            <ChipPicker label="Day" options={DAYS} value={day} onChange={setDay} />

            {editable && (
              <TouchableOpacity onPress={openAdd} style={[styles.addRow, { borderColor: rt.accent }]}>
                <Ionicons name="add-circle" size={22} color={rt.accent} />
                <Text style={[styles.addText, { color: rt.accent }]}>Add period to {day}</Text>
              </TouchableOpacity>
            )}

            {dayEntries.length === 0
              ? <EmptyState icon="calendar" text={`No periods on ${day}.`} />
              : dayEntries.map((e, i) => (
                <Card key={i} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <View style={[styles.slot, { backgroundColor: rt.accent + '18' }]}>
                      <Text style={[styles.slotNum, { color: rt.accent }]}>{e.slotNumber ?? i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subject}>{e.subject}</Text>
                      <Text style={styles.teacher}>{e.teacherName ?? 'Unassigned'}{e.room ? ` \u00b7 Room ${e.room}` : ''}</Text>
                    </View>
                    {(e.startTime || e.endTime) ? <Text style={styles.time}>{e.startTime}{e.endTime ? `\u2013${e.endTime}` : ''}</Text> : null}
                    {editable && (
                      <TouchableOpacity onPress={() => removeEntry(e)} style={{ padding: 4 }}>
                        <Ionicons name="trash" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </Card>
              ))
            }
          </>
        )}
      </ScrollView>

      {editable && entries !== null && (
        <View style={styles.saveBar}>
          <GradientButton label="Save Timetable" onPress={saveAll} loading={saving} colors={rt.gradient} />
        </View>
      )}

      <FormModal visible={formOpen} title={`Add period \u00b7 ${day}`} onClose={() => setFormOpen(false)}
        onSubmit={addEntry} submitLabel="Add">
        <Field label="Slot / Period No" value={entryForm.slotNumber} keyboardType="numeric" onChangeText={(v: string) => setEntryForm({ ...entryForm, slotNumber: v })} />
        <Field label="Subject *" value={entryForm.subject} onChangeText={(v: string) => setEntryForm({ ...entryForm, subject: v })} />
        <Field label="Teacher" value={entryForm.teacherName} onChangeText={(v: string) => setEntryForm({ ...entryForm, teacherName: v })} />
        <Field label="Room" value={entryForm.room} onChangeText={(v: string) => setEntryForm({ ...entryForm, room: v })} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Field label="Start" value={entryForm.startTime} placeholder="09:00" onChangeText={(v: string) => setEntryForm({ ...entryForm, startTime: v })} /></View>
          <View style={{ flex: 1 }}><Field label="End" value={entryForm.endTime} placeholder="09:45" onChangeText={(v: string) => setEntryForm({ ...entryForm, endTime: v })} /></View>
        </View>
      </FormModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  slot: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  slotNum: { ...font.h3 },
  subject: { ...font.title, color: colors.ink },
  teacher: { ...font.label, color: colors.muted, marginTop: 1 },
  time: { ...font.label, color: colors.slate },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 12,
    borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: spacing.sm },
  addText: { ...font.title },
  saveBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: colors.bg },
});