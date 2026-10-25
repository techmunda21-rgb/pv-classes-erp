import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Header } from '../../components/Header';
import { Colors } from '../../constants/Colors';
import { useApi } from '../../hooks/useApi';
import { useRouter } from 'expo-router';

export default function Courses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', duration: '', fee: '', description: '' });
  const { request, loading } = useApi();
  const router = useRouter();

  const load = async () => { try { setCourses(await request('GET', '/courses')); } catch {} };
  useEffect(() => { load(); }, []);

  const addCourse = async () => {
    if (!form.name || !form.code) { Alert.alert('Error', 'Name and code required'); return; }
    try {
      await request('POST', '/courses', { ...form, fee: parseInt(form.fee) || 0 });
      setModal(false);
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const courseColors = ['#4361ee', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <View style={styles.container}>
      <Header title="Courses" subtitle={`${courses.length} active`} onBack={() => router.back()} rightAction={{ label: '+ Add', onPress: () => setModal(true) }} />
      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}
      <FlatList
        data={courses}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item, index }) => (
          <View style={[styles.card, { borderLeftColor: courseColors[index % courseColors.length], borderLeftWidth: 4 }]}>
            <View style={styles.top}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.code}>{item.code}</Text>
            </View>
            <Text style={styles.desc}>{item.description}</Text>
            <View style={styles.row}>
              <View style={styles.pill}><Text style={styles.pillText}>⏱ {item.duration}</Text></View>
              <View style={styles.pill}><Text style={styles.pillText}>💰 ₹{item.fee?.toLocaleString('en-IN')}</Text></View>
              <View style={[styles.pill, { backgroundColor: Colors.primary + '15' }]}><Text style={[styles.pillText, { color: Colors.primary }]}>👨‍🎓 {item.student_count} students</Text></View>
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No courses found</Text> : null}
      />

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal}>
          <Text style={styles.modalTitle}>Add Course</Text>
          {[
            { key: 'name', label: 'Course Name *', placeholder: 'e.g. NEET 2025' },
            { key: 'code', label: 'Code *', placeholder: 'e.g. NEET-25' },
            { key: 'duration', label: 'Duration', placeholder: 'e.g. 1 Year' },
            { key: 'fee', label: 'Fee (₹)', placeholder: 'e.g. 85000', keyboard: 'numeric' as any },
            { key: 'description', label: 'Description', placeholder: 'Course details...' },
          ].map(f => (
            <View key={f.key} style={{ marginBottom: 14 }}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput style={styles.input} value={(form as any)[f.key]} onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))} placeholder={f.placeholder} keyboardType={f.keyboard || 'default'} placeholderTextColor={Colors.textSecondary} />
            </View>
          ))}
          <TouchableOpacity style={styles.btn} onPress={addCourse}><Text style={styles.btnText}>Add Course</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  name: { fontSize: 16, fontWeight: '800', color: Colors.text, flex: 1 },
  code: { fontSize: 12, fontWeight: '700', color: Colors.primary, backgroundColor: Colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  desc: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { backgroundColor: Colors.background, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  pillText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
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
