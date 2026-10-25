import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';

interface Props {
  title: string;
  value: string | number;
  icon: string;
  gradient?: [string, string];
  subtitle?: string;
}

export function StatCard({ title, value, icon, gradient = Colors.gradient, subtitle }: Props) {
  return (
    <LinearGradient colors={gradient} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    margin: 6,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  icon: { fontSize: 28 },
  value: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 8 },
  title: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 2 },
  subtitle: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
});
