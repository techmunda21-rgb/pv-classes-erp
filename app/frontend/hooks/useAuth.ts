import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_BASE } from '../constants/Api';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'student';
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await SecureStore.getItemAsync('pv_token');
      if (token) {
        const res = await axios.get(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
      }
    } catch {
      await SecureStore.deleteItemAsync('pv_token');
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
    await SecureStore.setItemAsync('pv_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }

  async function logout() {
    await SecureStore.deleteItemAsync('pv_token');
    setUser(null);
  }

  return { user, loading, login, logout };
}
