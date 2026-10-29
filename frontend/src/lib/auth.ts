export interface AuthUser {
  userId: number
  name: string
  role: string
  phone: string
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('pv_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getToken(): string | null {
  return localStorage.getItem('pv_token')
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem('pv_token', token)
  localStorage.setItem('pv_user', JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem('pv_token')
  localStorage.removeItem('pv_user')
}

export function isAdmin(user: AuthUser | null) {
  return user?.role === 'admin'
}

export function isTeacher(user: AuthUser | null) {
  return user?.role === 'teacher'
}

export function isStaff(user: AuthUser | null) {
  return user?.role === 'staff' || user?.role === 'admin'
}
