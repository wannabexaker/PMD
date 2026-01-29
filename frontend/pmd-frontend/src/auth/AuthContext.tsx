import type { ReactNode } from 'react'
import { AuthContext, useAuth } from './authUtils'
import type { User } from '../types'

export function AuthProvider({ user, children }: { user: User | null; children: ReactNode }) {
  const isAdmin = Boolean(user?.isAdmin)
  const isAuthed = Boolean(user)
  return <AuthContext.Provider value={{ user, isAdmin, isAuthed }}>{children}</AuthContext.Provider>
}

export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return null
  return <>{children}</>
}
