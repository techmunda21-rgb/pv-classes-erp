import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';

const modules = [
  { title: 'Courses', icon: '📚', route: '/(admin)/courses', color: '#7c3aed' },
  { title: 'Faculty', icon: '👩‍🏫', route: '/(admin)/faculty', color: '#10b981' },
  { title: 'Attendance', icon: '✅', route: '/(admin)/attendance', color: '#f59e0b' },
  { title: 'Results', icon: '📊', route: '/(admin)/results', color: '#3b82f6' },
  { title: 'Study Notes', icon: '📝', route: '/(admin)/notes', color: '#14b8a6' },
  { title: 'Timetable', icon: '🕐', route: '/(admin)/timetable', color: '#8b5cf6' },
  { title: 'WhatsApp', icon: '💬', route: '/(admin)/whatsapp', color: '#22c55e' },
  { title: 'Reports', icon: '📈', route: '/(admin)/reports', color: '#f97316' },
  { title: 'Settings', icon: '⚙️', route: '/(admin)/settings', color: '#6b7280' },
];

export default function More() {
  const router = useRouter();
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={Colors.gradient} style={styles.header}>
        <Text style={styles.headerTitle}>More Modules</Text>
        <Text style={styles.headerSub}>All ERP features</Text>
      </LinearGradient>
      <View style={styles.grid}>
        {modules.map(m => (
          <TouchableOpacity key={m.route} style={styles.card} onPress={() => router.push(m.route as any)} activeOpacity={0.8}>
            <View style={[styles.iconBox, { backgroundColor: m.color + '18' }]}>
              <Text style={styles.icon}>{m.icon}</Text>
            </View>
            <Text style={styles.title}>{m.title}</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  grid: { padding: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  icon: { fontSize: 24 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
  arrow: { fontSize: 24, color: Colors.textSecondary },
});
