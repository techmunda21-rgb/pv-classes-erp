import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Header } from '../../components/Header';
import { Colors } from '../../constants/Colors';
import { useApi } from '../../hooks/useApi';
import { useRouter } from 'expo-router';

export default function Results() {
  const [results, setResults] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ student_id: '', course_id: '1', subject: '', exam_type: 'Unit Test 1', marks_obtained: '', total_marks: '100', exam_date: new Date().toISOString().split('T')[0] });
  const { request, loading } = useApi();
  const router = useRouter();

  const load = async () => { try { setResults(await request('GET', '/results')); } catch {} };
  useEffect(() => { load(); }, []);

  const addResult = async () => {
    if (!form.student_id || !form.subject || !form.marks_obtained) { Alert.alert('Error', 'Fill required fields'); return; }
    try {
      await request('POST', '/results', { ...form, marks_obtained: parseInt(form.marks_obtained), total_marks: parseInt(form.total_marks), student_id: parseInt(form.student_id), course_id: parseInt(form.course_id) });
      setModal(false);
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const pct = (r: any) => r.total_marks ? Math.round(r.marks_obtained / r.total_marks * 100) : 0;
  const grade = (p: number) => p >= 90 ? 'A+' : p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 60 ? 'C' : 'D';
  const gradeColor = (p: number) => p >= 80 ? Colors.success : p >= 60 ? Colors.warning : Colors.danger;

  return (
    <View style={styles.container}>
      <Header title="Results" subtitle="Marks & Grades" onBack={() => router.back()} rightAction={{ label: '+ Add', onPress: () => setModal(true) }} />
      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}
      <FlatList
        data={results}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          const p = pct(item);
          return (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.student_name}</Text>
                <Text style={styles.sub}>{item.subject} · {item.exam_type}</Text>
                <Text style={styles.sub}>{item.course_name}</Text>
              </View>
              <View style={styles.scoreBox}>
                <Text style={styles.score}>{item.marks_obtained}/{item.total_marks}</Text>
                <View style={[styles.gradeBadge, { backgroundColor: gradeColor(p) + '20' }]}>
                  <Text style={[styles.gradeText, { color: gradeColor(p) }]}>{grade(p)} · {p}%</Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No results yet</Text> : null}
      />

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal}>
          <Text style={styles.modalTitle}>Add Result</Text>
          {[
            { key: 'student_id', label: 'Student ID *', kb: 'numeric' as any },
            { key: 'subject', label: 'Subject *', kb: 'default' as any },
            { key: 'exam_type', label: 'Exam Type', kb: 'default' as any },
            { key: 'marks_obtained', label: 'Marks Obtained *', kb: 'numeric' as any },
            { key: 'total_marks', label: 'Total Marks', kb: 'numeric' as any },
            { key: 'exam_date', label: 'Exam Date', kb: 'default' as any },
          ].map(f => (
            <View key={f.key} style={{ marginBottom: 14 }}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput style={styles.input} value={(form as any)[f.key]} onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))} keyboardType={f.kb} placeholderTextColor={Colors.textSecondary} />
            </View>
          ))}
          <TouchableOpacity style={styles.btn} onPress={addResult}><Text style={styles.btnText}>Save Result</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  scoreBox: { alignItems: 'flex-end' },
  score: { fontSize: 16, fontWeight: '800', color: Colors.text },
  gradeBadge: { marginTop: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  gradeText: { fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 60 },
  modal: { flex: 1, backgroundColor: Colors.background, padding: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 24, marginTop: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border },
  btn: { backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { padding: 16, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontSize: 15 },
});
