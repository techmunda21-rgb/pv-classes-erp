import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatCard } from '../../components/StatCard';
import { Colors } from '../../constants/Colors';
import { useApi } from '../../hooks/useApi';
import * as SecureStore from 'expo-secure-store';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { request, loading } = useApi();
  const router = useRouter();

  const load = async () => {
    try {
      const data = await request('GET', '/dashboard');
      setStats(data);
    } catch (e) {}
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await SecureStore.deleteItemAsync('pv_token'); router.replace('/(auth)/login'); } },
    ]);
  };

  const modules = [
    { title: 'Students', icon: '👨‍🎓', route: '/(admin)/students', color: Colors.primary },
    { title: 'Courses', icon: '📚', route: '/(admin)/courses', color: '#7c3aed' },
    { title: 'Faculty', icon: '👩‍🏫', route: '/(admin)/faculty', color: '#10b981' },
    { title: 'Attendance', icon: '✅', route: '/(admin)/attendance', color: '#f59e0b' },
    { title: 'Fees', icon: '💰', route: '/(admin)/fees', color: '#ef4444' },
    { title: 'Results', icon: '📊', route: '/(admin)/results', color: '#3b82f6' },
    { title: 'Notices', icon: '📢', route: '/(admin)/notices', color: '#ec4899' },
    { title: 'Notes', icon: '📝', route: '/(admin)/notes', color: '#14b8a6' },
    { title: 'Timetable', icon: '🕐', route: '/(admin)/timetable', color: '#8b5cf6' },
    { title: 'WhatsApp', icon: '💬', route: '/(admin)/whatsapp', color: '#22c55e' },
    { title: 'Reports', icon: '📈', route: '/(admin)/reports', color: '#f97316' },
    { title: 'Settings', icon: '⚙️', route: '/(admin)/settings', color: '#6b7280' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>
      <LinearGradient colors={Colors.gradient} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Good Morning 👋</Text>
            <Text style={styles.headerTitle}>PV Classes ERP</Text>
            <Text style={styles.headerSub}>Admin Dashboard</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard title="Total Students" value={stats?.totalStudents ?? '–'} icon="👨‍🎓" gradient={['#4361ee', '#3730a3']} />
          <StatCard title="Courses" value={stats?.totalCourses ?? '–'} icon="📚" gradient={['#7c3aed', '#6d28d9']} />
        </View>
        <View style={styles.statsRow}>
          <StatCard title="Faculty" value={stats?.totalFaculty ?? '–'} icon="👩‍🏫" gradient={['#10b981', '#059669']} />
          <StatCard title="Revenue" value={stats ? `₹${(stats.totalRevenue / 100000).toFixed(1)}L` : '–'} icon="💰" gradient={['#f59e0b', '#d97706']} />
        </View>
      </View>

      {/* All Modules */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Modules</Text>
        <View style={styles.modulesGrid}>
          {modules.map(m => (
            <TouchableOpacity key={m.route} style={styles.moduleCard} onPress={() => router.push(m.route as any)} activeOpacity={0.8}>
              <View style={[styles.moduleIconBox, { backgroundColor: m.color + '15' }]}>
                <Text style={styles.moduleIcon}>{m.icon}</Text>
              </View>
              <Text style={styles.moduleTitle}>{m.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Notices */}
      {stats?.recentNotices?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Notices</Text>
          {stats.recentNotices.slice(0, 3).map((n: any) => (
            <View key={n.id} style={styles.noticeCard}>
              <View style={[styles.noticeDot, { backgroundColor: n.priority === 'high' ? Colors.danger : Colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.noticeTitle}>{n.title}</Text>
                <Text style={styles.noticeContent} numberOfLines={2}>{n.content}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 4 },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginTop: 8 },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  statsGrid: { padding: 12 },
  statsRow: { flexDirection: 'row' },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  modulesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  moduleCard: { width: '30%', margin: '1.5%', backgroundColor: Colors.surface, borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  moduleIconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  moduleIcon: { fontSize: 26 },
  moduleTitle: { fontSize: 11, fontWeight: '600', color: Colors.text, marginTop: 8, textAlign: 'center' },
  noticeCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  noticeDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 10 },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  noticeContent: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
});
