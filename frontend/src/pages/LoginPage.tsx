import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../lib/api'
import { setAuth } from '../lib/auth'

interface LoginForm {
  phone: string
  password: string
}

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(data: LoginForm) {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', data)
      setAuth(res.data.token, res.data.user)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#07090f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16
    }}>
      <div style={{
        background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 380
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 28,
            background: 'linear-gradient(90deg,#f4b942,#ffd700)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>PV Classes</div>
          <div style={{ color: '#8892a4', fontSize: 13, marginTop: 4 }}>ERP — Sign in to continue</div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Phone Number</label>
            <input
              {...register('phone', { required: 'Phone is required' })}
              placeholder="9XXXXXXXXX"
              className="input"
            />
            {errors.phone && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.phone.message}</p>}
          </div>

          <div>
            <label className="label">Password</label>
            <input
              {...register('password', { required: 'Password is required' })}
              type="password"
              placeholder="••••••••"
              className="input"
            />
            {errors.password && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.password.message}</p>}
          </div>

          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ marginTop: 4, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#8892a4' }}>
          PV Classes, Jodhpur · Built by Techmunda
        </div>
      </div>
    </div>
  )
}
