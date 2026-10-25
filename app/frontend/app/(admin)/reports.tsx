import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Header } from '../../components/Header';
import { Colors } from '../../constants/Colors';
import { useApi } from '../../hooks/useApi';
import { useRouter } from 'expo-router';

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const { request, loading } = useApi();
  const router = useRouter();

  useEffect(() => {
    (async () => { try { setData(await request('GET', '/reports/overview')); } catch {} })();
  }, []);

  const StatRow = ({ label, value, color = Colors.text }: any) => (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Reports" subtitle="Analytics Overview" onBack={() => router.back()} />
      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {data && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>👨‍🎓 Students</Text>
              <StatRow label="Total Active" value={data.students.total} color={Colors.primary} />
              {data.students.byCourse?.map((c: any) => (
                <StatRow key={c.course} label={c.course} value={`${c.count} students`} />
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>💰 Fee Collection</Text>
              <StatRow label="Total Collected" value={`₹${data.fees.totalCollected?.toLocaleString('en-IN')}`} color={Colors.success} />
              <StatRow label="This Month" value={`₹${data.fees.thisMonth?.toLocaleString('en-IN')}`} />
              {data.fees.byMode?.map((m: any) => (
                <StatRow key={m.payment_mode} label={m.payment_mode} value={`₹${m.total?.toLocaleString('en-IN')}`} />
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>✅ Attendance</Text>
              <StatRow label="Avg Percentage" value={`${data.attendance.avgPercentage}%`} color={data.attendance.avgPercentage >= 75 ? Colors.success : Colors.danger} />
              <StatRow label="Present Today" value={data.attendance.today} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 Results</Text>
              <StatRow label="Average Score" value={`${data.results.avgMarks}%`} color={Colors.primary} />
            </View>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 16 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statLabel: { fontSize: 14, color: Colors.textSecondary },
  statValue: { fontSize: 14, fontWeight: '700' },
});
