import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { getUser, clearAuth } from '../lib/auth'
import {
  LayoutDashboard, Users, CreditCard, ClipboardCheck,
  Award, BookOpen, Calendar, Bell, FolderOpen, Settings, LogOut
} from 'lucide-react'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/fees', icon: CreditCard, label: 'Fees' },
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/results', icon: Award, label: 'Results' },
  { to: '/batches', icon: BookOpen, label: 'Batches' },
  { to: '/timetable', icon: Calendar, label: 'Timetable' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/documents', icon: FolderOpen, label: 'Documents' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  const user = getUser()
  const navigate = useNavigate()

  function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: '#0d1117',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        padding: '20px 12px', gap: 4, flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto'
      }}>
        {/* Brand */}
        <div style={{ padding: '4px 8px 20px' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18,
            background: 'linear-gradient(90deg,#f4b942,#ffd700)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            PV Classes
          </div>
          <div style={{ fontSize: 11, color: '#8892a4', marginTop: 2 }}>ERP System</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `sidebar-link${isActive ? ' active' : ''}`
            }>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 8 }}>
          <div style={{ padding: '8px 10px', marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: '#8892a4', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
