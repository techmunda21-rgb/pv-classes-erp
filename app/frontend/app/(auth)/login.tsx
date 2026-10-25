import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'admin' | 'student'>('admin');
  const { login } = useAuth();
  const router = useRouter();

  const fillDemo = (role: 'admin' | 'student') => {
    if (role === 'admin') { setEmail('keshavpurohit@gmail.com'); setPassword('admin123'); }
    else { setEmail('arjun@pvclasses.in'); setPassword('student123'); }
    setTab(role);
  };

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Enter email and password'); return; }
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') router.replace('/(admin)');
      else router.replace('/(student)');
    } catch (e: any) {
      Alert.alert('Login Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#4361ee', '#7c3aed']} style={styles.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoArea}>
            <Text style={styles.logo}>🎓</Text>
            <Text style={styles.appName}>PV Classes</Text>
            <Text style={styles.tagline}>All-in-One ERP</Text>
          </View>

          <View style={styles.card}>
            {/* Tab switcher */}
            <View style={styles.tabs}>
              {(['admin', 'student'] as const).map(t => (
                <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => fillDemo(t)}>
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'admin' ? '🔑 Admin' : '👨‍🎓 Student'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Email Address</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={Colors.textSecondary} />

            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry placeholderTextColor={Colors.textSecondary} />

            <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={Colors.gradient} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In →</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.hint}>💡 Tap Admin/Student tabs to auto-fill demo credentials</Text>
          </View>

          <Text style={styles.footer}>Built by Techmunda</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 64 },
  appName: { fontSize: 36, fontWeight: '900', color: '#fff', marginTop: 8 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4, letterSpacing: 2 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 20 },
  tabs: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  tabText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.background, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border },
  btn: { marginTop: 24, borderRadius: 14, overflow: 'hidden' },
  btnGradient: { paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  hint: { marginTop: 16, textAlign: 'center', color: Colors.textSecondary, fontSize: 12 },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginTop: 32, fontSize: 12 },
});
