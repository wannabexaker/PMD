import { createContext, useContext } from 'react'
import type { User } from '../types'

type AuthContextValue = {
  user: User | null
  isAdmin: boolean
  isAuthed: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  isAuthed: false,
})

export function AuthProvider({
  user,
  children,
}: {
  user: User | null
  children: React.ReactNode
}) {
  const isAdmin = (user?.team ?? '').toLowerCase() === 'admin'
  const isAuthed = Boolean(user)
  return (
    <AuthContext.Provider value={{ user, isAdmin, isAuthed }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return null
  return <>{children}</>
}
