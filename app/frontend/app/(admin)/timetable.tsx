import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Header } from '../../components/Header';
import { Colors } from '../../constants/Colors';
import { useApi } from '../../hooks/useApi';
import { useRouter } from 'expo-router';

export default function Timetable() {
  const [timetable, setTimetable] = useState<any[]>([]);
  const { request, loading } = useApi();
  const router = useRouter();

  useEffect(() => {
    (async () => { try { setTimetable(await request('GET', '/timetable')); } catch {} })();
  }, []);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayColors: Record<string, string> = { Monday: '#4361ee', Tuesday: '#7c3aed', Wednesday: '#10b981', Thursday: '#f59e0b', Friday: '#ef4444', Saturday: '#ec4899' };

  return (
    <View style={styles.container}>
      <Header title="Timetable" subtitle="Class schedule" onBack={() => router.back()} />
      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}
      <FlatList
        data={days}
        keyExtractor={d => d}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item: day }) => {
          const slots = timetable.filter(t => t.day === day);
          if (slots.length === 0) return null;
          return (
            <View style={styles.daySection}>
              <View style={[styles.dayHeader, { backgroundColor: dayColors[day] }]}>
                <Text style={styles.dayText}>{day}</Text>
                <Text style={styles.dayCount}>{slots.length} classes</Text>
              </View>
              {slots.map(slot => (
                <View key={slot.id} style={styles.slot}>
                  <View style={styles.timeBox}>
                    <Text style={styles.time}>{slot.start_time}</Text>
                    <Text style={styles.timeSep}>–</Text>
                    <Text style={styles.time}>{slot.end_time}</Text>
                  </View>
                  <View style={styles.slotInfo}>
                    <Text style={styles.subject}>{slot.subject}</Text>
                    <Text style={styles.teacher}>{slot.faculty_name}</Text>
                    <Text style={styles.room}>{slot.room} · {slot.course_name}</Text>
                  </View>
                </View>
              ))}
            </View>
          );
        }}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No timetable entries</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  daySection: { marginBottom: 16 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 10, marginBottom: 6 },
  dayText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  dayCount: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  slot: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  timeBox: { alignItems: 'center', marginRight: 14, minWidth: 52 },
  time: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  timeSep: { color: Colors.textSecondary, fontSize: 10 },
  slotInfo: { flex: 1 },
  subject: { fontSize: 14, fontWeight: '700', color: Colors.text },
  teacher: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  room: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 60 },
});
