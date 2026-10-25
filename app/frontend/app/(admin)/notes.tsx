import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Header } from '../../components/Header';
import { Colors } from '../../constants/Colors';
import { useApi } from '../../hooks/useApi';
import { useRouter } from 'expo-router';

export default function Notes() {
  const [notes, setNotes] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '', course_id: '1', description: '' });
  const { request, loading } = useApi();
  const router = useRouter();

  const load = async () => { try { setNotes(await request('GET', '/notes')); } catch {} };
  useEffect(() => { load(); }, []);

  const addNote = async () => {
    if (!form.title) { Alert.alert('Error', 'Title required'); return; }
    try { await request('POST', '/notes', form); setModal(false); load(); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <View style={styles.container}>
      <Header title="Study Notes" subtitle="Learning materials" onBack={() => router.back()} rightAction={{ label: '+ Add', onPress: () => setModal(true) }} />
      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}
      <FlatList
        data={notes}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.noteIcon}>📄</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.sub}>{item.subject} · {item.course_name}</Text>
              {item.description && <Text style={styles.desc}>{item.description}</Text>}
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No notes uploaded</Text> : null}
      />

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal}>
          <Text style={styles.modalTitle}>Add Study Note</Text>
          {[
            { key: 'title', label: 'Title *', placeholder: 'e.g. Physics Ch1 Notes' },
            { key: 'subject', label: 'Subject', placeholder: 'e.g. Physics' },
            { key: 'description', label: 'Description', placeholder: 'What this note covers...' },
          ].map(f => (
            <View key={f.key} style={{ marginBottom: 14 }}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput style={styles.input} value={(form as any)[f.key]} onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))} placeholder={f.placeholder} placeholderTextColor={Colors.textSecondary} />
            </View>
          ))}
          <TouchableOpacity style={styles.btn} onPress={addNote}><Text style={styles.btnText}>Save Note</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  noteIcon: { fontSize: 32, marginRight: 14, marginTop: 2 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  desc: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
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
