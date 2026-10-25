import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Header } from '../../components/Header';
import { Colors } from '../../constants/Colors';
import { useApi } from '../../hooks/useApi';
import { useRouter } from 'expo-router';

export default function Attendance() {
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<number, 'present' | 'absent'>>({});
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [courseId] = useState(1);
  const { request, loading } = useApi();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const s = await request('GET', `/students?course_id=${courseId}`);
        setStudents(s);
        const init: Record<number, 'present' | 'absent'> = {};
        s.forEach((st: any) => { init[st.id] = 'present'; });
        setAttendance(init);
      } catch {}
    })();
  }, []);

  const toggle = (id: number) => {
    setAttendance(p => ({ ...p, [id]: p[id] === 'present' ? 'absent' : 'present' }));
  };

  const submit = async () => {
    const records = Object.entries(attendance).map(([student_id, status]) => ({ student_id: parseInt(student_id), status }));
    try {
      await request('POST', '/attendance/batch', { records, date, course_id: courseId });
      Alert.alert('✅ Done', `Attendance marked for ${records.length} students`);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const present = Object.values(attendance).filter(v => v === 'present').length;

  return (
    <View style={styles.container}>
      <Header title="Attendance" subtitle={`${date} · ${present}/${students.length} present`} onBack={() => router.back()} rightAction={{ label: 'Submit', onPress: submit }} />
      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}
      <FlatList
        data={students}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          const status = attendance[item.id] || 'present';
          return (
            <TouchableOpacity style={[styles.card, status === 'absent' && styles.cardAbsent]} onPress={() => toggle(item.id)} activeOpacity={0.8}>
              <View style={[styles.dot, { backgroundColor: status === 'present' ? Colors.success : Colors.danger }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.roll}>{item.roll_number}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: status === 'present' ? Colors.success + '20' : Colors.danger + '20' }]}>
                <Text style={[styles.badgeText, { color: status === 'present' ? Colors.success : Colors.danger }]}>
                  {status === 'present' ? '✓ Present' : '✗ Absent'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No students in this course</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardAbsent: { backgroundColor: '#fff5f5' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  roll: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 60 },
});
