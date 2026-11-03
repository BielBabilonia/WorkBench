import { createContext, useContext } from 'react'
import type { User } from '../api/schemas'
import type { Permission } from '../lib/permissions'

export interface SessionContextValue {
  /** Null while the user list loads. */
  user: User | null
  signInAs: (userId: string) => void
  can: (permission: Permission) => boolean
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used inside <SessionProvider>')
  return context
}

/** For components that only render once the user is known (inside the app shell). */
export function useCurrentUser(): User {
  const { user } = useSession()
  if (!user) throw new Error('useCurrentUser called before the session loaded')
  return user
}
