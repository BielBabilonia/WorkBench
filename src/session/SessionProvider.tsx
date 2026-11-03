import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { setSessionUser } from '../api/client'
import { useUsers } from '../api/queries'
import { DEFAULT_USER_ID } from '../lib/demo'
import { hasPermission, type Permission } from '../lib/permissions'
import { storage } from '../lib/storage'
import { SessionContext } from './session-context'

const STORAGE_KEY = 'workbench.user'

/**
 * Demo sign-in: pick any seeded user to see the app with their role. A real app
 * would get the user from an auth token; everything downstream works the same.
 */
export function SessionProvider({ children, userId: forced }: { children: ReactNode; userId?: string }) {
  const [userId, setUserId] = useState(() => {
    const initial = forced ?? storage.get(STORAGE_KEY) ?? DEFAULT_USER_ID
    // Before the first query runs, so every request carries the session.
    setSessionUser(initial)
    return initial
  })
  const { data: users } = useUsers()

  // A stored id can point to nobody after a data reset: fall back to the default user.
  const user = users ? (users.find((u) => u.id === userId) ?? users.find((u) => u.id === DEFAULT_USER_ID) ?? null) : null
  if (user && user.id !== userId) {
    setSessionUser(user.id)
  }

  const signInAs = useCallback((id: string) => {
    setSessionUser(id)
    storage.set(STORAGE_KEY, id)
    setUserId(id)
  }, [])

  const value = useMemo(
    () => ({
      user,
      signInAs,
      can: (permission: Permission) => (user ? hasPermission(user.role, permission) : false),
    }),
    [user, signInAs],
  )

  return <SessionContext value={value}>{children}</SessionContext>
}
