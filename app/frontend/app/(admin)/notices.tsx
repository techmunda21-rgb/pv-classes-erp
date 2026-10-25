import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Header } from '../../components/Header';
import { Colors } from '../../constants/Colors';
import { useApi } from '../../hooks/useApi';
import { useRouter } from 'expo-router';

export default function Notices() {
  const [notices, setNotices] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'general', priority: 'normal' });
  const { request, loading } = useApi();
  const router = useRouter();

  const load = async () => {
    try { setNotices(await request('GET', '/notices')); } catch {}
  };
  useEffect(() => { load(); }, []);

  const addNotice = async () => {
    if (!form.title || !form.content) { Alert.alert('Error', 'Title and content required'); return; }
    try {
      await request('POST', '/notices', form);
      setModal(false);
      setForm({ title: '', content: '', category: 'general', priority: 'normal' });
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const deleteNotice = (id: number) => {
    Alert.alert('Delete', 'Delete this notice?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await request('DELETE', `/notices/${id}`); load(); } },
    ]);
  };

  const priorityColor = (p: string) => p === 'high' ? Colors.danger : p === 'medium' ? Colors.warning : Colors.textSecondary;

  return (
    <View style={styles.container}>
      <Header title="Notices" subtitle="Announcements" onBack={() => router.back()} rightAction={{ label: '+ Add', onPress: () => setModal(true) }} />
      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}
      <FlatList
        data={notices}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor(item.priority) }]} />
              <Text style={styles.title}>{item.title}</Text>
              <TouchableOpacity onPress={() => deleteNotice(item.id)}><Text style={{ color: Colors.danger }}>🗑</Text></TouchableOpacity>
            </View>
            <Text style={styles.content}>{item.content}</Text>
            <View style={styles.tags}>
              <View style={styles.tag}><Text style={styles.tagText}>{item.category}</Text></View>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('en-IN')}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No notices yet</Text> : null}
      />

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal}>
          <Text style={styles.modalTitle}>New Notice</Text>
          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v }))} placeholder="Notice title" placeholderTextColor={Colors.textSecondary} />
          <Text style={styles.label}>Content *</Text>
          <TextInput style={[styles.input, { height: 120, textAlignVertical: 'top' }]} value={form.content} onChangeText={v => setForm(p => ({ ...p, content: v }))} placeholder="Notice content..." multiline placeholderTextColor={Colors.textSecondary} />
          <Text style={styles.label}>Priority</Text>
          <View style={styles.pills}>
            {['normal', 'medium', 'high'].map(p => (
              <TouchableOpacity key={p} style={[styles.pill, form.priority === p && styles.pillActive]} onPress={() => setForm(prev => ({ ...prev, priority: p }))}>
                <Text style={[styles.pillText, form.priority === p && styles.pillTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.btn} onPress={addNotice}><Text style={styles.btnText}>Post Notice</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  priorityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  content: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  tags: { flexDirection: 'row', alignItems: 'center', marginTop: 10, justifyContent: 'space-between' },
  tag: { backgroundColor: Colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  date: { fontSize: 11, color: Colors.textSecondary },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 60 },
  modal: { flex: 1, backgroundColor: Colors.background, padding: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 24, marginTop: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border },
  pillActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  pillText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: Colors.primary },
  btn: { backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { padding: 16, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontSize: 15 },
});
