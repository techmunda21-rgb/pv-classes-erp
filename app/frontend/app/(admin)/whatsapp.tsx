import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { Header } from '../../components/Header';
import { Colors } from '../../constants/Colors';
import { useApi } from '../../hooks/useApi';
import { useRouter } from 'expo-router';

export default function WhatsApp() {
  const [logs, setLogs] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const { request, loading } = useApi();
  const router = useRouter();

  const load = async () => { try { setLogs(await request('GET', '/whatsapp/logs')); } catch {} };
  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!recipient || !message) { Alert.alert('Error', 'Recipient and message required'); return; }
    try { await request('POST', '/whatsapp/send', { recipient, message }); setModal(false); setRecipient(''); setMessage(''); load(); Alert.alert('✅ Sent', 'Message logged'); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const broadcast = async () => {
    if (!message) { Alert.alert('Error', 'Message required'); return; }
    try { const r = await request('POST', '/whatsapp/broadcast', { message }); setBroadcastModal(false); setMessage(''); load(); Alert.alert('✅ Broadcast', r.message); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <View style={styles.container}>
      <Header title="WhatsApp" subtitle="Messaging" onBack={() => router.back()} rightAction={{ label: '+ Send', onPress: () => setModal(true) }} />
      <View style={styles.broadcastBar}>
        <TouchableOpacity style={styles.broadcastBtn} onPress={() => setBroadcastModal(true)}>
          <Text style={styles.broadcastText}>📣 Broadcast to All Students</Text>
        </TouchableOpacity>
      </View>
      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}
      <FlatList
        data={logs}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.logCard}>
            <Text style={styles.logRecipient}>📱 {item.recipient}</Text>
            <Text style={styles.logMessage}>{item.message}</Text>
            <View style={styles.logFooter}>
              <View style={[styles.status, { backgroundColor: Colors.success + '20' }]}><Text style={[styles.statusText, { color: Colors.success }]}>✓ {item.status}</Text></View>
              <Text style={styles.logDate}>{new Date(item.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No messages sent yet</Text> : null}
      />

      {[{ visible: modal, onClose: () => setModal(false), title: 'Send Message', action: send, btnLabel: 'Send', showRecipient: true },
        { visible: broadcastModal, onClose: () => setBroadcastModal(false), title: 'Broadcast Message', action: broadcast, btnLabel: 'Broadcast to All', showRecipient: false }
      ].map((m, i) => (
        <Modal key={i} visible={m.visible} animationType="slide" presentationStyle="pageSheet">
          <ScrollView style={styles.modal}>
            <Text style={styles.modalTitle}>{m.title}</Text>
            {m.showRecipient && (<><Text style={styles.label}>Recipient Phone</Text><TextInput style={styles.input} value={recipient} onChangeText={setRecipient} placeholder="98XXXXXXXX" keyboardType="phone-pad" placeholderTextColor={Colors.textSecondary} /></>)}
            <Text style={styles.label}>Message</Text>
            <TextInput style={[styles.input, { height: 120, textAlignVertical: 'top' }]} value={message} onChangeText={setMessage} placeholder="Type your message..." multiline placeholderTextColor={Colors.textSecondary} />
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#22c55e' }]} onPress={m.action}><Text style={styles.btnText}>{m.btnLabel}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={m.onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </ScrollView>
        </Modal>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  broadcastBar: { padding: 12 },
  broadcastBtn: { backgroundColor: '#22c55e', borderRadius: 14, padding: 14, alignItems: 'center' },
  broadcastText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  logCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  logRecipient: { fontSize: 13, fontWeight: '700', color: Colors.text },
  logMessage: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, lineHeight: 20 },
  logFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  status: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  logDate: { fontSize: 11, color: Colors.textSecondary },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 60 },
  modal: { flex: 1, backgroundColor: Colors.background, padding: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 24, marginTop: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border },
  btn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { padding: 16, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontSize: 15 },
});
