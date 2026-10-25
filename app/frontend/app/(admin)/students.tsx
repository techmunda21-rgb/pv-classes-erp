import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Alert, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Header } from '../../components/Header';
import { Colors } from '../../constants/Colors';
import { useApi } from '../../hooks/useApi';
import { useRouter } from 'expo-router';

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', roll_number: '', course_id: '1', batch: 'Morning' });
  const { request, loading } = useApi();
  const router = useRouter();

  const load = async (q = '') => {
    try {
      const data = await request('GET', `/students${q ? `?search=${q}` : ''}`);
      setStudents(data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (t: string) => { setSearch(t); load(t); };

  const addStudent = async () => {
    if (!form.name || !form.roll_number) { Alert.alert('Error', 'Name and roll number required'); return; }
    try {
      await request('POST', '/students', form);
      setModal(false);
      setForm({ name: '', email: '', phone: '', roll_number: '', course_id: '1', batch: 'Morning' });
      load();
      Alert.alert('✅ Success', 'Student added successfully');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const deleteStudent = (id: number, name: string) => {
    Alert.alert('Delete', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await request('DELETE', `/students/${id}`); load(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="Students" subtitle={`${students.length} enrolled`} onBack={() => router.back()} rightAction={{ label: '+ Add', onPress: () => setModal(true) }} />
      <View style={styles.search}>
        <TextInput style={styles.searchInput} value={search} onChangeText={handleSearch} placeholder="🔍  Search students..." placeholderTextColor={Colors.textSecondary} />
      </View>
      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}
      <FlatList
        data={students}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{item.name[0]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{item.roll_number} · {item.course_name || 'No course'}</Text>
              <Text style={styles.sub}>{item.phone || item.email || '—'}</Text>
            </View>
            <View style={styles.actions}>
              <View style={[styles.badge, { backgroundColor: item.batch === 'Morning' ? '#dbeafe' : '#fef3c7' }]}>
                <Text style={{ fontSize: 11, color: Colors.primary }}>{item.batch}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteStudent(item.id, item.name)} style={styles.deleteBtn}>
                <Text style={{ color: Colors.danger, fontSize: 18 }}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No students found</Text> : null}
      />

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal}>
          <Text style={styles.modalTitle}>Add New Student</Text>
          {[
            { key: 'name', label: 'Full Name *', placeholder: 'e.g. Arjun Kumar' },
            { key: 'roll_number', label: 'Roll Number *', placeholder: 'e.g. PV2024009' },
            { key: 'email', label: 'Email', placeholder: 'student@pvclasses.in' },
            { key: 'phone', label: 'Phone', placeholder: '98XXXXXXXX' },
            { key: 'batch', label: 'Batch', placeholder: 'Morning / Evening' },
          ].map(f => (
            <View key={f.key} style={{ marginBottom: 14 }}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput style={styles.input} value={(form as any)[f.key]} onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))} placeholder={f.placeholder} placeholderTextColor={Colors.textSecondary} />
            </View>
          ))}
          <TouchableOpacity style={styles.btn} onPress={addStudent}>
            <Text style={styles.btnText}>Add Student</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  search: { padding: 12 },
  searchInput: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  actions: { alignItems: 'flex-end', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  deleteBtn: { padding: 4 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 60, fontSize: 15 },
  modal: { flex: 1, backgroundColor: Colors.background, padding: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 24, marginTop: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border },
  btn: { backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  cancelText: { color: Colors.textSecondary, fontSize: 15 },
});
