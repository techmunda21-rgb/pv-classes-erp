import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Header } from '../../components/Header';
import { Colors } from '../../constants/Colors';
import { useApi } from '../../hooks/useApi';
import { useRouter } from 'expo-router';

export default function Fees() {
  const [fees, setFees] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ student_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0], payment_mode: 'cash', remarks: '' });
  const { request, loading } = useApi();
  const router = useRouter();

  const load = async () => {
    try { setFees(await request('GET', '/fees')); } catch {}
  };
  useEffect(() => { load(); }, []);

  const totalRevenue = fees.reduce((s, f) => s + f.amount, 0);

  const collectFee = async () => {
    if (!form.student_id || !form.amount) { Alert.alert('Error', 'Student ID and amount required'); return; }
    try {
      const res = await request('POST', '/fees', { ...form, amount: parseInt(form.amount) });
      setModal(false);
      load();
      Alert.alert('✅ Fee Collected', `Receipt: ${res.receipt_number}`);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <View style={styles.container}>
      <Header title="Fee Management" subtitle={`Total: ₹${totalRevenue.toLocaleString('en-IN')}`} onBack={() => router.back()} rightAction={{ label: '+ Collect', onPress: () => setModal(true) }} />
      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}
      <FlatList
        data={fees}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.studentName}>{item.student_name}</Text>
              <Text style={styles.receipt}>🧾 {item.receipt_number}</Text>
              <Text style={styles.date}>{new Date(item.payment_date).toLocaleDateString('en-IN')} · {item.payment_mode}</Text>
            </View>
            <View style={styles.amountBox}>
              <Text style={styles.amount}>₹{item.amount.toLocaleString('en-IN')}</Text>
              <Text style={styles.paid}>PAID</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No fee records</Text> : null}
      />

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal}>
          <Text style={styles.modalTitle}>Collect Fee</Text>
          {[
            { key: 'student_id', label: 'Student ID *', placeholder: 'Enter student ID number' },
            { key: 'amount', label: 'Amount (₹) *', placeholder: 'e.g. 42500', keyboard: 'numeric' as any },
            { key: 'payment_date', label: 'Date', placeholder: 'YYYY-MM-DD' },
            { key: 'payment_mode', label: 'Mode (cash/online/cheque)', placeholder: 'cash' },
            { key: 'remarks', label: 'Remarks', placeholder: 'Optional' },
          ].map(f => (
            <View key={f.key} style={{ marginBottom: 14 }}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput style={styles.input} value={(form as any)[f.key]} onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))} placeholder={f.placeholder} keyboardType={f.keyboard || 'default'} placeholderTextColor={Colors.textSecondary} />
            </View>
          ))}
          <TouchableOpacity style={styles.btn} onPress={collectFee}><Text style={styles.btnText}>Collect Fee</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardLeft: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  receipt: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  date: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  amountBox: { alignItems: 'flex-end' },
  amount: { fontSize: 18, fontWeight: '800', color: Colors.success },
  paid: { fontSize: 10, color: Colors.success, fontWeight: '700', backgroundColor: Colors.success + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 60 },
  modal: { flex: 1, backgroundColor: Colors.background, padding: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 24, marginTop: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border },
  btn: { backgroundColor: Colors.success, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { padding: 16, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontSize: 15 },
});
