import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/Colors';
import axios from 'axios';
import { API_BASE } from '../constants/Api';

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('pv_token');
        if (token) {
          const res = await axios.get(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.data.role === 'admin') router.replace('/(admin)');
          else router.replace('/(student)');
        } else {
          router.replace('/(auth)/login');
        }
      } catch {
        router.replace('/(auth)/login');
      }
    })();
  }, []);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
