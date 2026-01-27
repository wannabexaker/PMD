import { createContext, useContext } from 'react'
import type { User } from '../types'

type AuthContextValue = {
  user: User | null
  isAdmin: boolean
  isAuthed: boolean
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  isAuthed: false,
})

export function useAuth() {
  return useContext(AuthContext)
}
