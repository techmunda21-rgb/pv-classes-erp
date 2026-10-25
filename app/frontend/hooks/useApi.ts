import { useState, useCallback } from 'react';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../constants/Api';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (method: string, path: string, data?: any) => {
    setLoading(true);
    setError(null);
    try {
      const token = await SecureStore.getItemAsync('pv_token');
      const response = await axios({
        method,
        url: `${API_BASE}${path}`,
        data,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Request failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
}
