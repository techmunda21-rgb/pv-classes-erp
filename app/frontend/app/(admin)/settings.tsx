import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Header } from '../../components/Header';
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export default function Settings() {
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await SecureStore.deleteItemAsync('pv_token'); router.replace('/(auth)/login'); } },
    ]);
  };

  const items = [
    { label: 'Institute Name', value: 'PV Classes', icon: '🏫' },
    { label: 'App Version', value: '1.0.0', icon: '📱' },
    { label: 'Backend API', value: 'localhost:3000', icon: '🌐' },
    { label: 'Developer', value: 'Techmunda', icon: '💻' },
    { label: 'Support Email', value: 'support@pvclasses.in', icon: '📧' },
  ];

  return (
    <View style={styles.container}>
      <Header title="Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          {items.map((item, i) => (
            <View key={i} style={[styles.row, i < items.length - 1 && styles.rowBorder]}>
              <Text style={styles.icon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.value}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪  Logout</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>PV Classes ERP · Built by Techmunda</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 4, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  icon: { fontSize: 22, marginRight: 14 },
  label: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  value: { fontSize: 15, fontWeight: '600', color: Colors.text, marginTop: 2 },
  logoutBtn: { backgroundColor: '#fef2f2', borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' },
  logoutText: { color: Colors.danger, fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', color: Colors.textSecondary, fontSize: 12, marginTop: 24, marginBottom: 40 },
});
