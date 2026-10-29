import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { Users, CreditCard, ClipboardCheck, Award } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
  })

  const { data: feeChart } = useQuery({
    queryKey: ['fee-chart'],
    queryFn: () => api.get('/dashboard/fee-chart').then(r => r.data),
  })

  const kpis = [
    { label: 'Total Students', value: stats?.total_students ?? '—', icon: Users, color: '#4361ee' },
    { label: 'Today Attendance', value: stats?.today_attendance_pct ? `${stats.today_attendance_pct}%` : '—', icon: ClipboardCheck, color: '#34d399' },
    { label: 'Fees Collected', value: stats?.fees_collected ? `₹${Number(stats.fees_collected).toLocaleString('en-IN')}` : '—', icon: CreditCard, color: '#f4b942' },
    { label: 'Pending Results', value: stats?.pending_results ?? '—', icon: Award, color: '#c4b5fd' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, margin: 0 }}>Dashboard</h1>
        <p style={{ color: '#8892a4', fontSize: 13, marginTop: 4 }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 12, color: '#8892a4', fontWeight: 600 }}>{label}</div>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontFamily: 'Syne, sans-serif', fontWeight: 800 }}>
              {isLoading ? <div style={{ height: 32, width: 80, background: 'rgba(255,255,255,0.05)', borderRadius: 6 }} /> : value}
            </div>
          </div>
        ))}
      </div>

      {/* Fee Chart */}
      {feeChart && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Monthly Fee Collection</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={feeChart}>
              <defs>
                <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4361ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4361ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: '#8892a4', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#161b27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12 }}
                formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Collected']}
              />
              <Area type="monotone" dataKey="collected" stroke="#4361ee" strokeWidth={2} fill="url(#feeGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
