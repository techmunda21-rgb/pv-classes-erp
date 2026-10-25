import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Header } from '../../components/Header';
import { Colors } from '../../constants/Colors';
import { useApi } from '../../hooks/useApi';
import { useRouter } from 'expo-router';

export default function Faculty() {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', qualification: '' });
  const { request, loading } = useApi();
  const router = useRouter();

  const load = async () => { try { setFaculty(await request('GET', '/faculty')); } catch {} };
  useEffect(() => { load(); }, []);

  const addFaculty = async () => {
    if (!form.name || !form.subject) { Alert.alert('Error', 'Name and subject required'); return; }
    try { await request('POST', '/faculty', form); setModal(false); load(); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const subjectColors: Record<string, string> = { Physics: '#3b82f6', Chemistry: '#10b981', Mathematics: '#f59e0b', Biology: '#ec4899' };

  return (
    <View style={styles.container}>
      <Header title="Faculty" subtitle={`${faculty.length} members`} onBack={() => router.back()} rightAction={{ label: '+ Add', onPress: () => setModal(true) }} />
      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}
      <FlatList
        data={faculty}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.avatar, { backgroundColor: (subjectColors[item.subject] || Colors.primary) + '25' }]}>
              <Text style={[styles.avatarText, { color: subjectColors[item.subject] || Colors.primary }]}>{item.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={[styles.subjectBadge, { backgroundColor: (subjectColors[item.subject] || Colors.primary) + '15' }]}>
                <Text style={[styles.subjectText, { color: subjectColors[item.subject] || Colors.primary }]}>{item.subject}</Text>
              </View>
              <Text style={styles.sub}>{item.qualification}</Text>
              <Text style={styles.sub}>{item.phone}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No faculty added</Text> : null}
      />

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal}>
          <Text style={styles.modalTitle}>Add Faculty</Text>
          {['name', 'email', 'phone', 'subject', 'qualification'].map(key => (
            <View key={key} style={{ marginBottom: 14 }}>
              <Text style={styles.label}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
              <TextInput style={styles.input} value={(form as any)[key]} onChangeText={v => setForm(p => ({ ...p, [key]: v }))} placeholder={`Enter ${key}`} placeholderTextColor={Colors.textSecondary} />
            </View>
          ))}
          <TouchableOpacity style={styles.btn} onPress={addFaculty}><Text style={styles.btnText}>Add Faculty</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 22, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subjectBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 4 },
  subjectText: { fontSize: 12, fontWeight: '600' },
  sub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
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
