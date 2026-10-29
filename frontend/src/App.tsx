import { Routes, Route, Navigate } from 'react-router-dom'
import { getUser } from './lib/auth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import StudentsPage from './pages/StudentsPage'
import FeesPage from './pages/FeesPage'
import AttendancePage from './pages/AttendancePage'
import ResultsPage from './pages/ResultsPage'
import BatchesPage from './pages/BatchesPage'
import TimetablePage from './pages/TimetablePage'
import NotificationsPage from './pages/NotificationsPage'
import DocumentsPage from './pages/DocumentsPage'
import SettingsPage from './pages/SettingsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = getUser()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="batches" element={<BatchesPage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
