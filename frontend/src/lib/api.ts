import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.pvclasses.in'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('pv_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 → redirect to login
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pv_token')
      localStorage.removeItem('pv_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
