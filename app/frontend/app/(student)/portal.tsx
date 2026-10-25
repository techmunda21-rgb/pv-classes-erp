import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { useApi } from '../../hooks/useApi';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export default function StudentPortal() {
  const [data, setData] = useState<any>(null);
  const { request, loading } = useApi();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const [notices, fees] = await Promise.all([
          request('GET', '/notices'),
          request('GET', '/fees'),
        ]);
        setData({ notices, fees });
      } catch {}
    })();
  }, []);

  const logout = () => Alert.alert('Logout', 'Sure?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Logout', style: 'destructive', onPress: async () => { await SecureStore.deleteItemAsync('pv_token'); router.replace('/(auth)/login'); } },
  ]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#7c3aed', '#4361ee']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.greeting}>Welcome back 👋</Text>
        <Text style={styles.title}>Student Portal</Text>
        <Text style={styles.sub}>PV Classes</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </LinearGradient>

      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: Colors.primary }]}>
          <Text style={styles.statValue}>{data?.fees?.length || 0}</Text>
          <Text style={styles.statLabel}>Payments</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#7c3aed' }]}>
          <Text style={styles.statValue}>{data?.notices?.length || 0}</Text>
          <Text style={styles.statLabel}>Notices</Text>
        </View>
      </View>

      {/* Notices */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📢 Latest Notices</Text>
        {data?.notices?.slice(0, 5).map((n: any) => (
          <View key={n.id} style={styles.noticeCard}>
            <View style={[styles.priorityDot, { backgroundColor: n.priority === 'high' ? Colors.danger : Colors.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>{n.title}</Text>
              <Text style={styles.noticeContent}>{n.content}</Text>
              <Text style={styles.noticeDate}>{new Date(n.created_at).toLocaleDateString('en-IN')}</Text>
            </View>
          </View>
        ))}
        {!data?.notices?.length && !loading && <Text style={styles.empty}>No notices</Text>}
      </View>

      {/* Fee History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Fee Payments</Text>
        {data?.fees?.slice(0, 5).map((f: any) => (
          <View key={f.id} style={styles.feeCard}>
            <View>
              <Text style={styles.feeName}>{f.receipt_number}</Text>
              <Text style={styles.feeDate}>{new Date(f.payment_date).toLocaleDateString('en-IN')} · {f.payment_mode}</Text>
            </View>
            <Text style={styles.feeAmount}>₹{f.amount?.toLocaleString('en-IN')}</Text>
          </View>
        ))}
        {!data?.fees?.length && !loading && <Text style={styles.empty}>No payment records</Text>}
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24, position: 'relative' },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 6 },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  logoutBtn: { position: 'absolute', right: 24, top: 60, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, borderRadius: 16, padding: 20, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 32, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4, fontWeight: '600' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  noticeCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, marginRight: 10 },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  noticeContent: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  noticeDate: { fontSize: 11, color: Colors.textSecondary, marginTop: 6 },
  feeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  feeName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  feeDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  feeAmount: { fontSize: 18, fontWeight: '800', color: Colors.success },
  empty: { textAlign: 'center', color: Colors.textSecondary, fontSize: 14, marginTop: 12 },
});
